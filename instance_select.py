import argparse
import json

def filter_instances(data, region, vcpus, memory, arch):
    filtered = []
    filtered = [instance for instance in data if region in set(instance['pricing'].keys())]
    filtered = [instance for instance in filtered if int(instance['vCPU']) == int(vcpus)]
    filtered = [instance for instance in filtered if int(instance['memory']) == int(memory)]
    filtered = [instance for instance in filtered if arch in instance.get('arch', [])]

    return [{"instance_type": instance['instance_type'], **instance['pricing'][region]['linux']}
            for instance in filtered
            if region in instance['pricing'] and \
            'linux' in instance['pricing'][region]]

def find_cheapest(instances, cost_type):
    cheapest = None
    for instance in instances:
        if cost_type == 'spot':
            if instance.get('pct_interrupt', 0) == '<5%':
                print(instance['instance_type'])
#            if instance.get('pct_savings_od', 0) > 70:
#                print(instance)
            # price = float(instance.get('spot_avg', float('inf')))
        elif cost_type == 'ondemand':
            price = float(instance.get('ondemand', float('inf')))
        else:  # blend
            spot_price = float(instance.get('spot_avg', float('inf')))
            ondemand_price = float(instance.get('ondemand', float('inf')))
            price = min(spot_price, ondemand_price)

    #     if cheapest is None or price < cheapest[1]:
    #         cheapest = (instance, price)
    # if cheapest:
    #     print(cheapest)
    #     return {
    #         "instance_type": cheapest[0]['instance_type'],
    #         "spot_price": cheapest[0].get('spot_avg'),
    #         "ondemand_price": cheapest[0].get('ondemand')
    #     }

def main():
    parser = argparse.ArgumentParser(description='Select Linux instances based on criteria.')
    parser.add_argument('--region', type=str, required=True, help='Region name')
    parser.add_argument('--vcpus', type=int, required=True, help='Number of vCPUs')
    parser.add_argument('--memory', type=int, required=True, help='Memory in GB')
    parser.add_argument('--arch', type=str, required=True, choices=['arm64', 'arm64_mac', 'i386', 'x86_64', 'x86_64_mac'], help='Architecture')
    parser.add_argument('--cheapest', type=str, choices=['spot', 'ondemand', 'blend'], help='Find the cheapest instance based on spot, ondemand, or blend prices')

    args = parser.parse_args()

    data = json.load(open("www/instances.json"))

    instances = filter_instances(data, args.region, args.vcpus, args.memory, args.arch)

    if args.cheapest:
        result = find_cheapest(instances, args.cheapest)
        print(json.dumps(result, indent=4))
    else:
        print(json.dumps(instances, indent=4))

if __name__ == '__main__':
    main()
