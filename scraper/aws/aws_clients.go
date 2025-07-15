package aws

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/elasticache"
)

var (
	ec2Client         *ec2.Client
	elasticacheClient *elasticache.Client
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	cfg.Region = "us-east-1"
	if err != nil {
		panic(err)
	}
	ec2Client = ec2.NewFromConfig(cfg)
	elasticacheClient = elasticache.NewFromConfig(cfg)
}
