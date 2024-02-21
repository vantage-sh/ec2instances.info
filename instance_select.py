import argparse
import json

def load_data(file_path):
    with open(file_path, 'r') as file:
        return json.load(file)

def filter_instances(data, region, vcpus, memory, arch):
    filtered = []
    for instance_id, attributes in data.items():
        if attributes.get('region') == region and \
           attributes.get('vcpus') == vcpus and \
           attributes.get('memory') == memory and \
           arch in attributes.get('arch', []) and \
           'linux' in attributes:
            filtered.append({"instance_type": instance_id, **attributes['linux']})
    return filtered

def find_cheapest(instances, cost_type):
    cheapest = None
    for instance in instances:
        if cost_type == 'spot':
            price = float(instance.get('spot_avg', float('inf')))
        elif cost_type == 'ondemand':
            price = float(instance.get('ondemand', float('inf')))
        else:  # blend
            spot_price = float(instance.get('spot_avg', float('inf')))
            ondemand_price = float(instance.get('ondemand', float('inf')))
            price = min(spot_price, ondemand_price)

        if cheapest is None or price < cheapest[1]:
            cheapest = (instance, price)
    if cheapest:
        return {"instance_type": cheapest[0]['instance_type'], "spot_price": cheapest[0].get('spot_avg'), "ondemand_price": cheapest[0].get('ondemand')}
    return None

def main():
    parser = argparse.ArgumentParser(description='Select Linux instances based on criteria.')
    parser.add_argument('file_path', type=str, help='Path to the JSON data file')
    parser.add_argument('--region', type=str, required=True, help='Region name')
    parser.add_argument('--vcpus', type=int, required=True, help='Number of vCPUs')
    parser.add_argument('--memory', type=int, required=True, help='Memory in GB')
    parser.add_argument('--arch', type=str, required=True, choices=['arm64', 'arm64_mac', 'i386', 'x86_64', 'x86_64_mac'], help='Architecture')
    parser.add_argument('--cheapest', type=str, choices=['spot', 'ondemand', 'blend'], help='Find the cheapest instance based on spot, ondemand, or blend prices')

    args = parser.parse_args()

    data = load_data(args.file_path)
    instances = filter_instances(data, args.region, args.vcpus, args.memory, args.arch)

    if args.cheapest:
        result = find_cheapest(instances, args.cheapest)
        print(json.dumps(result, indent=4))
    else:
        print(json.dumps(instances, indent=4))

if __name__ == '__main__':
    main()
