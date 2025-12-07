package awsutils

type RegionProduct struct {
	SKU           string            `json:"sku"`
	ProductFamily string            `json:"productFamily"`
	Attributes    map[string]string `json:"attributes"`
}

type RegionPriceDimension struct {
	RateCode     string            `json:"rateCode"`
	Description  string            `json:"description"`
	BeginRange   string            `json:"beginRange"`
	EndRange     string            `json:"endRange"`
	Unit         string            `json:"unit"`
	PricePerUnit map[string]string `json:"pricePerUnit"`
}

type RegionTerm struct {
	SKU             string                          `json:"sku"`
	PriceDimensions map[string]RegionPriceDimension `json:"priceDimensions"`
	TermAttributes  map[string]string               `json:"termAttributes"`
}

type RegionTerms struct {
	OnDemand map[string]map[string]RegionTerm `json:"OnDemand"`
	Reserved map[string]map[string]RegionTerm `json:"Reserved"`
}

type RegionData struct {
	Products map[string]RegionProduct `json:"products"`
	Terms    RegionTerms              `json:"terms"`
}

type RawRegion struct {
	// SavingsPlanData is set to non-nil when this is done. If nil, this is regular pricing data.
	// If not, this is the end and the savings plan data is to be processed. The map can be nil.
	SavingsPlanData func() map[regionSlug]map[sku]map[term]float64

	RegionName string
	RegionData RegionData
}

type SavingsPlanProduct struct {
	SKU        string            `json:"sku"`
	Attributes map[string]string `json:"attributes"`
}

type SavingsPlanLeaseContractLength struct {
	Duration int    `json:"duration"`
	Unit     string `json:"unit"`
}

type SavingsPlanDiscountedRate struct {
	Price    string `json:"price"`
	Currency string `json:"currency"`
}

type SavingsPlanRate struct {
	DiscountedSKU  string                    `json:"discountedSku"`
	DiscountedRate SavingsPlanDiscountedRate `json:"discountedRate"`
}

type SavingsPlanTerm struct {
	SKU                 string                         `json:"sku"`
	Description         string                         `json:"description"`
	LeaseContractLength SavingsPlanLeaseContractLength `json:"leaseContractLength"`
	Rates               []SavingsPlanRate              `json:"rates"`
}

type RawSavingsPlanRegion struct {
	Products []SavingsPlanProduct `json:"products"`
	Terms    struct {
		SavingsPlan []SavingsPlanTerm `json:"savingsPlan"`
	} `json:"terms"`
}
