#!/usr/bin/env python
import requests
import json
from json import encoder
import os
import sys


def openexchange_scrape(output_file):
    try:
        api_key = os.environ['OPENEXCHANGE_API_KEY']
    except KeyError as e:
        sys.exit('Error! Please provide your open exchange API key as an environment variable called OPENEXCHANGE_API_KEY')
    payload_url = 'https://openexchangerates.org/api/latest.json?app_id=' + api_key
    index = requests.get(payload_url)
    data = index.json()

    # print json.dumps(data)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, '.5f')
    with open(output_file, 'w') as outfile:
        json.dump(data, outfile, indent=4)


if __name__ == '__main__':
    output_file = './www/exchange_rates.json'
    openexchange_scrape(output_file)
