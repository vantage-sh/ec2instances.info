package main

import (
	"fmt"
	"image"
	"image/jpeg"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/disintegration/imaging"
	"github.com/golang/freetype/truetype"
)

const (
	imgWidth  = 1911
	imgHeight = 1156
	numWorkers = 20
)

var vantageOgNote = `
NOTE: OpenGraph image generation is currently using a Vantage background, owned by Vantage.
It is not MIT licensed! It is totally fine to use this in development, but if you aren't Vantage
and deploying to production, please set OPENGRAPH_URL to something else. Ideally, make this
image 1911x1156.
`

func main() {
	bgURL := os.Getenv("OPENGRAPH_URL")
	if bgURL == "" {
		bgURL = "https://instances.vantage.sh/opengraph_bg.jpg"
		fmt.Fprintln(os.Stderr, vantageOgNote)
	}

	baseURL := os.Getenv("NEXT_PUBLIC_URL")
	if baseURL == "" {
		fmt.Fprintln(os.Stderr, "error: NEXT_PUBLIC_URL is not set")
		os.Exit(1)
	}

	assetsDir := os.Getenv("IMAGEGEN_ASSETS_DIR")
	if assetsDir == "" {
		assetsDir = filepath.Join("..", "next", "imageGen")
	}

	wwwDir := os.Getenv("IMAGEGEN_WWW_DIR")
	if wwwDir == "" {
		wwwDir = filepath.Join("..", "www")
	}

	outDir := os.Getenv("IMAGEGEN_OUT_DIR")
	if outDir == "" {
		outDir = filepath.Join("..", "www")
	}

	onlyInstances := parseOnlyInstances()

	baseImg, err := fetchAndResizeBase(bgURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to fetch base image: %v\n", err)
		os.Exit(1)
	}

	fontPath := filepath.Join(assetsDir, "fonts", "inter", "Inter-VariableFont_slnt,wght.ttf")
	fontData, err := os.ReadFile(fontPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load font: %v\n", err)
		os.Exit(1)
	}
	parsedFont, err := truetype.Parse(fontData)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to parse font: %v\n", err)
		os.Exit(1)
	}

	iconCache := &iconCache{dir: assetsDir}

	ctx := &genContext{
		baseURL:      baseURL,
		wwwDir:       wwwDir,
		outDir:       outDir,
		assetsDir:    assetsDir,
	}

	var allOverlays []InstanceOverlay
	allOverlays = append(allOverlays, generateEC2Overlays(ctx)...)
	allOverlays = append(allOverlays, generateRDSOverlays(ctx)...)
	allOverlays = append(allOverlays, generateElastiCacheOverlays(ctx)...)
	allOverlays = append(allOverlays, generateRedshiftOverlays(ctx)...)
	allOverlays = append(allOverlays, generateOpenSearchOverlays(ctx)...)
	allOverlays = append(allOverlays, generateAzureOverlays(ctx)...)
	allOverlays = append(allOverlays, generateGCPOverlays(ctx)...)

	sem := make(chan struct{}, numWorkers)
	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstErr error

	for _, overlay := range allOverlays {
		if len(onlyInstances) > 0 {
			if _, ok := onlyInstances[overlay.InstanceType]; !ok {
				continue
			}
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(o InstanceOverlay) {
			defer wg.Done()
			defer func() { <-sem }()

			if err := makeImage(baseImg, o, parsedFont, iconCache); err != nil {
				mu.Lock()
				if firstErr == nil {
					firstErr = fmt.Errorf("generating %s: %w", o.Filename, err)
				}
				mu.Unlock()
			}
		}(overlay)
	}

	wg.Wait()

	if firstErr != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", firstErr)
		os.Exit(1)
	}

	fmt.Println("Done!")
}

func fetchAndResizeBase(url string) (image.Image, error) {
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("image returned response %d", resp.StatusCode)
	}
	img, err := jpeg.Decode(resp.Body)
	if err != nil {
		// Try generic decode if not JPEG
		return nil, fmt.Errorf("decoding image: %w", err)
	}
	return imaging.Resize(img, imgWidth, imgHeight, imaging.Lanczos), nil
}

func parseOnlyInstances() map[string]struct{} {
	s := os.Getenv("ONLY_INSTANCES")
	if s == "" {
		return nil
	}
	m := map[string]struct{}{}
	for _, v := range strings.Split(s, ",") {
		v = strings.TrimSpace(v)
		if v != "" {
			m[v] = struct{}{}
		}
	}
	return m
}
