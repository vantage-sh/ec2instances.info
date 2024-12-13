import boto3
import concurrent.futures
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any

class ParallelPricingCollector:
    def __init__(self, max_workers=10):
        self.max_workers = max_workers
        self.logger = logging.getLogger('scraper.PricingCollector')

    def _fetch_pricing_data_for_region(self, region: str, service_code: str, filters: List[Dict]) -> Dict:
        """Fetch pricing data for a specific region"""
        logger = logging.getLogger(f'scraper.pricing.{region}')

        try:
            pricing_client = boto3.client('pricing', region_name='us-east-1')  # Pricing API only available in us-east-1
            paginator = pricing_client.get_paginator('get_products')

            products = []
            for page in paginator.paginate(
                ServiceCode=service_code,
                Filters=[
                    *filters,
                    {'Type': 'TERM_MATCH', 'Field': 'location', 'Value': region}
                ]
            ):
                products.extend(page['PriceList'])

            return {'region': region, 'products': products}

        except Exception as e:
            logger.error(f"Error fetching pricing data for region {region}: {str(e)}")
            return {'region': region, 'products': [], 'error': str(e)}

    def _process_pricing_data(self, pricing_data: Dict, instance_map: Dict) -> None:
        """Process pricing data for a region and update instance pricing information"""
        try:
            region = pricing_data['region']
            products = pricing_data['products']

            for price_data in products:
                # Extract relevant pricing info
                product = price_data.get('product', {})
                attributes = product.get('attributes', {})

                instance_type = attributes.get('instanceType')
                if not instance_type or instance_type not in instance_map:
                    continue

                instance = instance_map[instance_type]

                # Initialize pricing structure if needed
                instance.pricing.setdefault(region, {})

                # Process on-demand pricing
                terms = price_data.get('terms', {})
                ondemand_terms = terms.get('OnDemand', {})
                for term_data in ondemand_terms.values():
                    price_dimensions = term_data.get('priceDimensions', {})
                    for dimension in price_dimensions.values():
                        if 'USD' in dimension.get('pricePerUnit', {}):
                            price = float(dimension['pricePerUnit']['USD'])
                            operating_system = attributes.get('operatingSystem', 'Linux')
                            preinstalled_software = attributes.get('preInstalledSw', 'NA')

                            platform = self._translate_platform(operating_system, preinstalled_software)
                            instance.pricing[region].setdefault(platform, {})
                            instance.pricing[region][platform]['ondemand'] = price

        except Exception as e:
            self.logger.error(f"Error processing pricing data for region {region}: {str(e)}")

    def _translate_platform(self, operating_system: str, preinstalled_software: str) -> str:
        """Translate AWS platform names to internal representation"""
        os_map = {
            'Linux': 'linux',
            'RHEL': 'rhel',
            'SUSE': 'sles',
            'Windows': 'mswin',
            'Linux/UNIX': 'linux'
        }

        software_map = {
            'NA': '',
            'SQL Std': 'SQL',
            'SQL Web': 'SQLWeb',
            'SQL Ent': 'SQLEnterprise'
        }

        os_key = os_map.get(operating_system, 'linux')
        software_key = software_map.get(preinstalled_software, '')
        return os_key + software_key

    def collect_pricing(self, instances: List[Any], regions: List[str]) -> None:
        """Collect pricing data in parallel for all instances"""
        instance_map = {i.instance_type: i for i in instances}

        filters = [
            {'Type': 'TERM_MATCH', 'Field': 'capacityStatus', 'Value': 'Used'},
            {'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'},
            {'Type': 'TERM_MATCH', 'Field': 'licenseModel', 'Value': 'No License required'}
        ]

        # Initialize pricing dictionaries
        for instance in instances:
            instance.pricing = {}

        # Fetch pricing data in parallel for all regions
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_region = {
                executor.submit(
                    self._fetch_pricing_data_for_region,
                    region,
                    'AmazonEC2',
                    filters
                ): region for region in regions
            }

            for future in as_completed(future_to_region):
                region = future_to_region[future]
                try:
                    pricing_data = future.result()
                    self._process_pricing_data(pricing_data, instance_map)
                    self.logger.debug(f"Completed pricing collection for region {region}")
                except Exception as e:
                    self.logger.error(f"Failed to collect pricing for region {region}: {str(e)}")