package ec2

import (
	"scraper/aws/awsutils"
	"scraper/utils"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

// Setup sets up the EC2 data processing module
func Setup(
	fg *utils.FunctionGroup,
	ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo],
) (chan *awsutils.RawRegion, chan *awsutils.RawRegion) {
	// Start all the data getters in the background
	spotDataPartialGetter := utils.BlockUntilDone(getSpotDataPartial)
	t2HtmlGetter := utils.BlockUntilDone(getT2Html)

	// Spawn the EC2 data processing threads
	ec2GlobalChannel := make(chan *awsutils.RawRegion)
	ec2ChinaChannel := make(chan *awsutils.RawRegion)
	getters := ec2DataGetters{
		spotDataPartialGetter: spotDataPartialGetter,
		t2HtmlGetter:          t2HtmlGetter,
	}
	fg.Add(func() {
		processEC2Data(ec2ChinaChannel, ec2ApiResponses, true, getters)
	})
	fg.Add(func() {
		processEC2Data(ec2GlobalChannel, ec2ApiResponses, false, getters)
	})

	return ec2GlobalChannel, ec2ChinaChannel
}
