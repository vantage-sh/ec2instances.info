package ec2

import (
	"math"
	"strconv"
	"strings"
)

const ec2LicenseIncluded = "No License required"

// shouldIncludeEC2PricingSku filters alternate Windows license SKUs that AWS
// publishes alongside the standard license-included rate. BYOL and
// infrastructure-license SKUs price compute only (matching Linux) and have their
// own savings-plan rates; if we keep them, the last write wins and Windows
// reserved/savings columns show Linux-equivalent prices.
func shouldIncludeEC2PricingSku(platform, licenseModel string) bool {
	if !strings.HasPrefix(platform, "mswin") {
		return true
	}
	return licenseModel == ec2LicenseIncluded
}

// skuOnDemandMatchesPlatform reports whether a SKU's on-demand rate is the
// canonical rate already stored for its platform. When multiple SKUs share a
// platform (e.g. several "No License required" Windows variants), only the SKU
// whose on-demand matches the stored platform price should contribute reserved
// and savings-plan rates.
func skuOnDemandMatchesPlatform(skuOnDemand float64, platformOnDemand string) bool {
	if skuOnDemand <= 0 {
		return true
	}
	platformPrice, err := strconv.ParseFloat(platformOnDemand, 64)
	if err != nil || platformPrice <= 0 {
		return true
	}
	return math.Abs(skuOnDemand-platformPrice) < 1e-9
}
