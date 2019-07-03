#!/usr/bin/env python
import requests
import json
from json import encoder


def openexchange_scrape(output_file):
    payload_url = 'https://openexchangerates.org/api/latest.json?app_id=255b3db9f4d44ae18d02613a5b5857a2'
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
