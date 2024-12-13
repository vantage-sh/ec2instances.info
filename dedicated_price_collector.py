import requests
import json
import gzip
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any
import threading
from urllib.parse import quote

class DedicatedPriceCollector:
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.logger = logging.getLogger('DedicatedPriceCollector')
        self.lock = threading.Lock()

    def _fetch_data(self, url: str) -> Dict:
        """Helper method to fetch and parse JSON data from URLs"""
        try:
            response = requests.get(url)
            response.raise_for_status()  # Raises an HTTPError for bad responses
            content = response.content

            try:
                content = content.decode()
            except UnicodeDecodeError:
                content = gzip.decompress(content).decode()

            try:
                data = json.loads(content)
            except ValueError:
                # If the data isn't compatible JSON, try to parse as jsonP
                json_string = re.search(r"callback\((.*)\);", content).groups()[0]
                json_string = re.sub(r"(\w+):", r'"\1":', json_string)
                data = json.loads(json_string)

            return data

        except Exception as e:
            self.logger.error(f"Error fetching data from {url}: {str(e)}")
            raise

    def _format_price(self, price: float) -> str:
        """Helper method to format prices consistently"""
        return str(float("%f" % float(price))).rstrip('0').rstrip('.')

    def _fetch_ondemand_prices(self) -> Dict[str, Any]:
        """Fetch on-demand pricing data for dedicated hosts"""
        url = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-ondemand.json"
        try:
            od_pricing = self._fetch_data(url)
            all_pricing = {}

            for region in od_pricing["regions"]:
                all_pricing[region] = {}
                for instance_description, dinst in od_pricing["regions"][region].items():
                    _price = {"ondemand": self._format_price(dinst["price"]), "reserved": {}}
                    all_pricing[region][dinst["Instance Type"]] = _price

            return all_pricing
        except Exception as e:
            self.logger.error(f"Error fetching on-demand pricing: {str(e)}")
            raise

    def _fetch_reserved_price(self, params: Dict) -> Dict:
        """Fetch reserved pricing data for a specific region/term/payment combination"""
        region = params['region']
        term = params['term']
        payment = params['payment']

        try:
            base = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-reservedinstance-virtual/"
            path = f"{quote(region)}/{quote(term)}/{quote(payment)}/index.json"

            pricing = self._fetch_data(base + path)
            results = []

            reserved_map = {
                "1yrNoUpfront": "yrTerm1Standard.noUpfront",
                "1yrPartialUpfront": "yrTerm1Standard.partialUpfront",
                "1yrAllUpfront": "yrTerm1Standard.allUpfront",
                "1 yrNoUpfront": "yrTerm1Standard.noUpfront",
                "1 yrPartialUpfront": "yrTerm1Standard.partialUpfront",
                "1 yrAllUpfront": "yrTerm1Standard.allUpfront",
                "3yrNoUpfront": "yrTerm3Standard.noUpfront",
                "3yrPartialUpfront": "yrTerm3Standard.partialUpfront",
                "3yrAllUpfront": "yrTerm3Standard.allUpfront",
                "3 yrNoUpfront": "yrTerm3Standard.noUpfront",
                "3 yrPartialUpfront": "yrTerm3Standard.partialUpfront",
                "3 yrAllUpfront": "yrTerm3Standard.allUpfront",
            }

            for instance_description, dinst in pricing["regions"][region].items():
                upfront = 0.0
                if "Partial" in payment or "All" in payment:
                    upfront = float(dinst["riupfront:PricePerUnit"])

                inst_type = dinst["Instance Type"]
                ondemand = float(dinst["price"])
                lease_in_years = int(dinst["LeaseContractLength"][0])
                hours_in_term = lease_in_years * 365 * 24
                price = float(ondemand) + (float(upfront) / hours_in_term)

                translate_ri = reserved_map[
                    dinst["LeaseContractLength"] + dinst["PurchaseOption"]
                ]

                results.append({
                    'region': region,
                    'instance_type': inst_type,
                    'pricing_term': translate_ri,
                    'price': self._format_price(price)
                })

            return results

        except Exception as e:
            self.logger.warning(
                f"Failed to fetch reserved pricing for region={region}, term={term}, "
                f"payment={payment}: {str(e)}"
            )
            return []

    def _update_pricing_dict(self, all_pricing: Dict, result: Dict) -> None:
        """Thread-safe update of the pricing dictionary"""
        with self.lock:
            region = result['region']
            inst_type = result['instance_type']
            pricing_term = result['pricing_term']
            price = result['price']

            if inst_type not in all_pricing[region]:
                all_pricing[region][inst_type] = {"reserved": {}}

            all_pricing[region][inst_type]["reserved"][pricing_term] = price

    def fetch_dedicated_prices(self) -> Dict:
        """Fetch all dedicated host pricing data using parallel processing"""
        self.logger.info("Starting dedicated price collection")

        # First fetch on-demand pricing
        all_pricing = self._fetch_ondemand_prices()

        # Prepare parameters for reserved price fetching
        fetch_params = []
        terms = ["3 year", "1 year"]
        payments = ["No Upfront", "Partial Upfront", "All Upfront"]

        for region in all_pricing.keys():
            for term in terms:
                for payment in payments:
                    fetch_params.append({
                        'region': region,
                        'term': term,
                        'payment': payment
                    })

        # Fetch reserved pricing in parallel
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_params = {
                executor.submit(self._fetch_reserved_price, params): params
                for params in fetch_params
            }

            for future in as_completed(future_to_params):
                params = future_to_params[future]
                try:
                    results = future.result()
                    for result in results:
                        self._update_pricing_dict(all_pricing, result)
                except Exception as e:
                    self.logger.error(
                        f"Error processing results for region={params['region']}, "
                        f"term={params['term']}, payment={params['payment']}: {str(e)}"
                    )

        self.logger.info("Completed dedicated price collection")
        return all_pricing