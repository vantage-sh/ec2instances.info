#!/usr/bin/env python
import requests
import json
import scrape
import os


def parse_instance(i, info):
    i.instance_type = info["armSkuName"]
    i.pretty_name = info["productName"]
    print('Found pricing for {}'.format(i.instance_type))
    if info["armRegionName"] not in i.pricing:
        i.pricing[info["armRegionName"]] = {'ondemand': info["retailPrice"]}

    
def azure_vm_specs():
    from azure.identity import DefaultAzureCredential
    from azure.mgmt.compute import ComputeManagementClient

    credential = DefaultAzureCredential()

    # Retrieve subscription ID from environment variable.
    subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]

    # Obtain the management object for resources.
    compute_client = ComputeManagementClient(credential, subscription_id)

    # Retrieve the list of resource groups
    # group_list = resource_client.resource_groups.list()
    # print(dir(resource_client.resources))
    # print(group_list)

    # print(dir(resource_client.resources))
    # for r in resource_client.resources.list():
    #     print(r)
    skus_list = compute_client.resource_skus.list()
    i = 0
    for s in skus_list:
        if s.resource_type == 'virtualMachines':
            print(s)
            for c in s.capabilities:
                print(c)
            i += 1
        if i > 1000:
            break
    print(i)




def azure_prices():
    instances = {}

    response = requests.get("https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines'").json()
    next_page_url = response["NextPageLink"]
    j = 0
    while next_page_url:
        for pricing in response["Items"]:         
            apiname = pricing["armSkuName"]
            if apiname not in instances:
                instances[apiname] = scrape.Instance()
            parse_instance(instances[apiname], pricing)


        response = requests.get(next_page_url).json()
        print(len(response["Items"]))
        next_page_url = response["NextPageLink"]
        j += 1
        if j > 10:
            break

    [print(json.dumps(inst.to_dict(), indent=4)) for inst in instances.values()]



if __name__ == '__main__':
    azure_vm_specs()