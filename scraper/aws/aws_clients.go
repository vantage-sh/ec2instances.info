package aws

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/elasticache"
)

var elasticacheClient *elasticache.Client

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	cfg.Region = "us-east-1"
	if err != nil {
		panic(err)
	}
	elasticacheClient = elasticache.NewFromConfig(cfg)
}
