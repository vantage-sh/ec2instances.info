from concurrent.futures import ThreadPoolExecutor, as_completed
import concurrent.futures
import boto3
import requests
import json
from typing import Dict, List, Any
import ec2
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

class ParallelScraper:
    def __init__(self, max_workers=10):
        self.max_workers = max_workers
        self.logger = logging.getLogger('scraper.ParallelScraper')

    def _fetch_instance_data(self, region: str) -> Dict:
        """Fetch EC2 instance data for a specific region"""
        try:
            ec2_client = boto3.client('ec2', region_name=region)
            paginator = ec2_client.get_paginator('describe_instance_types')

            instances = []
            for page in paginator.paginate():
                instances.extend(page['InstanceTypes'])

            self.logger.debug(f"Fetched {len(instances)} instances from {region}")
            return {'region': region, 'instances': instances}

        except Exception as e:
            self.logger.error(f"Error fetching instance data for region {region}: {str(e)}")
            return {'region': region, 'instances': []}

    def _fetch_pricing_data(self, region: str, service_code: str, filters: List[Dict]) -> Dict:
        """Fetch pricing data for a specific region and service"""
        logger = logging.getLogger(f'scraper.pricing.{region}')

        try:
            logger.debug(f"Starting pricing data fetch for {service_code}")
            pricing_client = boto3.client('pricing', region_name='us-east-1')
            paginator = pricing_client.get_paginator('get_products')

            products = []
            page_count = 0

            for page in paginator.paginate(ServiceCode=service_code, Filters=filters):
                products.extend(page['PriceList'])
                page_count += 1
                logger.debug(f"Retrieved page {page_count} with {len(page['PriceList'])} products")

            log_api_call('pricing', 'get_products',
                params={'ServiceCode': service_code, 'Filters': filters},
                response={'TotalProducts': len(products), 'Pages': page_count})

            return {'region': region, 'data': products}

        except Exception as e:
            log_api_call('pricing', 'get_products',
                params={'ServiceCode': service_code, 'Filters': filters},
                error=str(e))
            logger.error(f"Error fetching pricing data: {str(e)}", exc_info=True)
            return {'region': region, 'data': []}

    def parallel_pricing_fetch(self, regions: List[str], service_code: str, filters: List[Dict]) -> Dict[str, List]:
        """Fetch pricing data for multiple regions in parallel"""
        pricing_data = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_region = {
                executor.submit(self._fetch_pricing_data, region, service_code, filters): region
                for region in regions
            }

            for future in as_completed(future_to_region):
                result = future.result()
                pricing_data[result['region']] = result['data']

        return pricing_data

    def _fetch_instance_data(self, region: str) -> Dict:
        """Fetch EC2 instance data for a specific region"""
        try:
            ec2_client = boto3.client('ec2', region_name=region)
            paginator = ec2_client.get_paginator('describe_instance_types')

            instances = []
            for page in paginator.paginate():
                instances.extend(page['InstanceTypes'])

            self.logger.debug(f"Fetched {len(instances)} instances from {region}")
            return {'region': region, 'instances': instances}

        except Exception as e:
            self.logger.error(f"Error fetching instance data for region {region}: {str(e)}")
            return {'region': region, 'instances': []}

    def parallel_instance_fetch(self, regions: List[str]) -> Dict[str, List]:
        """Fetch instance data for multiple regions in parallel"""
        instance_data = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_region = {
                executor.submit(self._fetch_instance_data, region): region
                for region in regions
            }

            for future in as_completed(future_to_region):
                result = future.result()
                instance_data[result['region']] = result['instances']

        return instance_data

    def _fetch_spot_prices(self, region: str, instance_types: List[str]) -> Dict:
        """Fetch spot price history for a region and instance types"""
        try:
            ec2_client = boto3.client('ec2', region_name=region)
            prices = ec2_client.describe_spot_price_history(
                InstanceTypes=instance_types,
                StartTime=datetime.now()
            )
            return {'region': region, 'prices': prices['SpotPriceHistory']}
        except Exception as e:
            print(f"Error fetching spot prices for region {region}: {e}")
            return {'region': region, 'prices': []}

    def parallel_spot_price_fetch(self, regions: List[str], instance_types: List[str]) -> Dict[str, List]:
        """Fetch spot prices for multiple regions in parallel"""
        spot_prices = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_region = {
                executor.submit(self._fetch_spot_prices, region, instance_types): region
                for region in regions
            }

            for future in as_completed(future_to_region):
                result = future.result()
                spot_prices[result['region']] = result['prices']

        return spot_prices

    def _fetch_availability_zones(self, region: str) -> Dict:
        """Fetch availability zones for a region"""
        try:
            ec2_client = boto3.client('ec2', region_name=region)
            response = ec2_client.describe_availability_zones()
            return {'region': region, 'zones': response['AvailabilityZones']}
        except Exception as e:
            print(f"Error fetching AZs for region {region}: {e}")
            return {'region': region, 'zones': []}

    def parallel_az_fetch(self, regions: List[str]) -> Dict[str, List]:
        """Fetch availability zones for multiple regions in parallel"""
        az_data = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_region = {
                executor.submit(self._fetch_availability_zones, region): region
                for region in regions
            }

            for future in as_completed(future_to_region):
                result = future.result()
                az_data[result['region']] = result['zones']

        return az_data