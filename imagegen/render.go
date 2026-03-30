package main

import (
	"image"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"sync"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
	"github.com/golang/freetype/truetype"
	"golang.org/x/image/font"
)

const (
	maxRowCol = 2
	rowHeight = 100
	topStart  = 230
	leftStart = 120

	// Font sizes in points (at 72 DPI, 1pt ≈ 1px).
	// The full image is 1911x1156 before a 2x Lanczos downscale to ~955x578.
	titleFontPt  = 56.0 // Sharp: dpi=400 default ~56px equivalent
	headerFontPt = 40.0 // Sharp: height=40px
	labelFontPt  = 44.0 // Sharp: height=44px (bold label)
	valueFontPt  = 40.0 // Sharp: height=40px
	urlFontPt    = 30.0 // Sharp: height=30px
)

// iconCache caches decoded icon images so they are only loaded once.
type iconCache struct {
	mu    sync.RWMutex
	cache map[string]image.Image
	dir   string
}

func (c *iconCache) get(relPath string) (image.Image, error) {
	c.mu.RLock()
	if img, ok := c.cache[relPath]; ok {
		c.mu.RUnlock()
		return img, nil
	}
	c.mu.RUnlock()

	img, err := imaging.Open(filepath.Join(c.dir, relPath))
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	if c.cache == nil {
		c.cache = map[string]image.Image{}
	}
	c.cache[relPath] = img
	c.mu.Unlock()

	return img, nil
}

func newFace(f *truetype.Font, pts float64) font.Face {
	return truetype.NewFace(f, &truetype.Options{
		Size:    pts,
		DPI:     72,
		Hinting: font.HintingFull,
	})
}

// ascent returns the pixel ascent for the current font face in dc.
// It is used to convert Sharp's "top" coordinate to gg's baseline y.
func ascent(dc *gg.Context) float64 {
	// FontHeight() returns ascent + descent + leading in pixels.
	// Inter's ascent is ~78% of total height.
	return dc.FontHeight() * 0.78
}

// drawTextAt draws text so that its top-left aligns with (x, y),
// matching Sharp's composite `top`/`left` semantics.
func drawTextAt(dc *gg.Context, text string, x, y float64) {
	dc.DrawString(text, x, y+ascent(dc))
}

func makeImage(base image.Image, overlay InstanceOverlay, parsedFont *truetype.Font, icons *iconCache) error {
	dc := gg.NewContextForImage(base)
	dc.SetRGB(1, 1, 1)

	// --- Category header at (leftStart, topStart) ---
	dc.SetFontFace(newFace(parsedFont, headerFontPt))
	drawTextAt(dc, overlay.CategoryHeader, leftStart, topStart)

	// --- Spec rows starting at (leftStart, topStart+100) ---
	if err := drawSpecRows(dc, overlay.Values, parsedFont, icons); err != nil {
		return err
	}

	// --- URL at (10, 1120) ---
	dc.SetFontFace(newFace(parsedFont, urlFontPt))
	drawTextAt(dc, overlay.URL, 10, 1120)

	// --- Title centered vertically at y=152, left at x=440 ---
	// Sharp places the title image so its vertical center is at y=152.
	dc.SetFontFace(newFace(parsedFont, titleFontPt))
	titleH := dc.FontHeight()
	// baseline = 152 + titleH*0.25 centers the text around y=152
	dc.DrawString(overlay.Name, 440, 152+titleH*0.25)

	// --- Downscale 50% with Lanczos ---
	fullImg := dc.Image()
	w := fullImg.Bounds().Dx() / 2
	h := fullImg.Bounds().Dy() / 2
	scaled := imaging.Resize(fullImg, w, h, imaging.Lanczos)

	if err := os.MkdirAll(filepath.Dir(overlay.Filename), 0o755); err != nil {
		return err
	}
	f, err := os.Create(overlay.Filename)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, scaled)
}

func drawSpecRows(dc *gg.Context, values []Value, parsedFont *truetype.Font, icons *iconCache) error {
	// Replicate the TypeScript firstColMaxWidth heuristic.
	firstColMaxWidth := 0.0
	for i, v := range values {
		if i%maxRowCol == 0 {
			titleWidth := float64(len(v.Name)+1) * 30
			valueWidth := float64(len(v.Value)) * 24
			maxWidth := math.Max(titleWidth, valueWidth) + 200
			if maxWidth > firstColMaxWidth {
				firstColMaxWidth = maxWidth
			}
		}
	}

	top := float64(topStart + 100) // 330
	left := float64(leftStart)     // 120
	currentRowCol := 0

	labelFace := newFace(parsedFont, labelFontPt)
	valueFace := newFace(parsedFont, valueFontPt)

	for _, v := range values {
		if currentRowCol == maxRowCol {
			currentRowCol = 0
			top += rowHeight + 100 // advance row
			left = leftStart
		}
		currentRowCol++

		// Icon at (left, top)
		icon, err := icons.get(v.SquareIconPath)
		if err != nil {
			return err
		}
		dc.DrawImage(icon, int(left), int(top))

		// Label at (left+190, top+20)
		dc.SetFontFace(labelFace)
		dc.SetRGB(1, 1, 1)
		drawTextAt(dc, v.Name+":", left+190, top+20)

		// Value at (left+190, top+80)
		dc.SetFontFace(valueFace)
		drawTextAt(dc, v.Value, left+190, top+80)

		left += firstColMaxWidth + 50
	}

	return nil
}
