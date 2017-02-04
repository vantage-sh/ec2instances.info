<%!
  active_ = "ec2"
  import json
%>
<%inherit file="base.mako" />

    <%block name="header">
    <h1>EC2Instances.info <small>Easy Amazon EC2 Instance Comparison</small></h1>
    </%block>

    <div class="row" id="menu">
      <div class="col-sm-12">
        <div class="btn-group" id='region-dropdown'>
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-globe icon-white"></i>
            Region: <span class="text"></span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a href="javascript:;" data-region='ap-south-1'>Asia-Pacific (Mumbai)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-2'>Asia-Pacific (Seoul)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-1'>Asia-Pacific (Singapore)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-2'>Asia-Pacific (Sydney)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-1'>Asia-Pacific (Tokyo)</a></li>
            <li><a href="javascript:;" data-region='ca-central-1'>Canada (Central)</a></li>
            <li><a href="javascript:;" data-region='eu-central-1'>EU (Frankfurt)</a></li>
            <li><a href="javascript:;" data-region='eu-west-1'>EU (Ireland)</a></li>
            <li><a href="javascript:;" data-region='eu-west-2'>EU (London)</a></li>
            <li><a href="javascript:;" data-region='sa-east-1'>South America (S&atilde;o Paulo)</a></li>
            <li><a href="javascript:;" data-region='us-east-1'>US East (N. Virginia)</a></li>
            <li><a href="javascript:;" data-region='us-east-2'>US East (Ohio)</a></li>
            <li><a href="javascript:;" data-region='us-west-1'>US West (Northern California)</a></li>
            <li><a href="javascript:;" data-region='us-west-2'>US West (Oregon)</a></li>
          </ul>
        </div>

        <div class="btn-group" id="cost-dropdown">
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-shopping-cart icon-white"></i>
            Cost: <span class="text"></span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a href="javascript:;" duration="hourly">Hourly</a></li>
            <li><a href="javascript:;" duration="daily">Daily</a></li>
            <li><a href="javascript:;" duration="weekly">Weekly</a></li>
            <li><a href="javascript:;" duration="monthly">Monthly</a></li>
            <li><a href="javascript:;" duration="annually">Annually</a></li>
          </ul>
        </div>

        <div class="btn-group" id='reserved-term-dropdown'>
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-globe icon-white"></i>
            Reserved: <span class="text">1 yr - No Upfront</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a href="javascript:;" data-reserved-term='yrTerm1Standard.noUpfront'>1 yr - No Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm1Standard.partialUpfront'>1 yr - Partial Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm1Standard.allUpfront'>1 yr - Full Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm3Standard.partialUpfront'>3 yr - Partial Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm3Standard.allUpfront'>3 yr - Full Upfront</a></li>
          </ul>
        </div>

        <div class="btn-group" id="filter-dropdown">
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-filter icon-white"></i>
            Columns
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <!-- table header elements inserted by js -->
          </ul>
        </div>

        <button class="btn btn-primary btn-compare"
          data-text-on="End Compare"
          data-text-off="Compare Selected">
          Compare Selected
        </button>

        <button class="btn btn-primary btn-clear">
          Clear Filters
        </button>
      </div>
    </div>

    <div class="form-inline" id="filters">
      <strong> Filter:</strong>
      Min Memory (GB): <input data-action="datafilter" data-type="memory" class="form-control" />
      Compute Units: <input data-action="datafilter" data-type="computeunits" class="form-control" />
      Storage (GB): <input data-action="datafilter" data-type="storage" class="form-control" />
    </div>

    <table cellspacing="0" class="table table-bordered table-hover table-condensed" id="data">
      <thead>
        <tr>
          <th class="name">Name</th>
          <th class="apiname">API Name</th>
          <th class="memory">Memory</th>
          <th class="computeunits">
            <abbr title="One EC2 Compute Unit provides the equivalent CPU capacity of a 1.0-1.2 GHz 2007 Opteron or 2007 Xeon processor.">Compute Units (ECU)</abbr>
          </th>
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="ecu-per-vcpu">ECU per vCPU</th>
          <th class="storage">Storage</th>
          <th class="architecture">Arch</th>
          <th class="networkperf">Network Performance</th>
          <th class="ebs-max-bandwidth">EBS Optimized: Max Bandwidth</th>
          <th class="ebs-throughput">EBS Optimized: Throughput</th>
          <th class="ebs-iops">EBS Optimized: Max 16K IOPS</th>
          <th class="maxips">
            <abbr title="Adding additional IPs requires launching the instance in a VPC.">Max IPs</abbr>
          </th>
          <th class="enhanced-networking">Enhanced Networking</th>
          <th class="vpc-only">VPC Only</th>
          <th class="ipv6-support">IPv6 Support</th>
          <th class="linux-virtualization">Linux Virtualization</th>

          <th class="cost-ondemand cost-ondemand-linux">Linux On Demand cost</th>
          <th class="cost-reserved cost-reserved-linux">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-mswin">Windows On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswin">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-mswinSQLWeb">Windows SQL Web On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswinSQLWeb">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows SQL Web Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-mswinSQL">Windows SQL Std On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswinSQL">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows SQL Std Reserved cost</abbr>
          </th>
        </tr>
      </thead>
      <tbody>
% for inst in instances:
        <tr class='instance' id="${inst['instance_type']}">
          <td class="name">${inst['pretty_name']}</td>
          <td class="apiname">${inst['instance_type']}</td>
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GB</span></td>
          <td class="computeunits">
            % if inst['ECU'] == 'variable':
              % if inst['base_performance']:
              <span sort="${inst['base_performance']}">
                <abbr title="For T2 instances, the 100% unit represents a High Frequency Intel Xeon Processors with Turbo up to 3.3GHz.">
                <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/t2-instances.html" target="_blank">Base performance:
                ${"%g" % (inst['base_performance'] * 100,)}%
                </a></abbr>
              </span>
              % else:
              <span sort="0"><a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts_micro_instances.html" target="_blank">Burstable</a></span>
              % endif
            % else:
            <span sort="${inst['ECU']}">${"%g" % (inst['ECU'],)} units</span>
            % endif
          </td>
          <td class="vcpus">
            <span sort="${inst['vCPU']}">
              ${inst['vCPU']} vCPUs
                % if inst['burst_minutes']:
                <abbr title="Given that a CPU Credit represents the performance of a full CPU core for one minute, the maximum credit balance is converted to CPU burst minutes per day by dividing it by the number of vCPUs.">
                <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/t2-instances.html" target="_blank">
                for a
                ${"%gh %gm" % divmod(inst['burst_minutes'], 60)}
                burst
                </a></abbr>
                % endif
            </span>
          </td>
          <td class="ecu-per-vcpu">
            % if inst['ECU'] == 'variable':
            <span sort="0"><a href="http://aws.amazon.com/ec2/instance-types/#burst" target="_blank">Burstable</a></span>
            % else:
            <span sort="${inst['ECU_per_vcpu']}">${"%.4g" % inst['ECU_per_vcpu']} units</span>
            % endif
          </td>
          <td class="storage">
            <% storage = inst['storage'] %>
            % if not storage:
            <span sort="0">0 GB (EBS only)</span>
            % else:
            <span sort="${storage['devices']*storage['size']}">
              ${storage['devices']*storage['size']} GB
              % if storage['devices'] > 1:
              (${storage['devices']} * ${storage['size']} GB${" SSD" if storage['ssd'] else ''})
              % else:
              ${"SSD" if storage['ssd'] else ''}
              % endif
            </span>
            % endif
          </td>
          <td class="architecture">
            % if 'i386' in inst['arch']:
            32/64-bit
            % else:
            64-bit
            % endif
          </td>
          <td class="networkperf">
            <span sort="${inst['network_sort']}">
              ${inst['network_performance']}
            </span>
          </td>
          <td class="ebs-max-bandwidth">
            % if not inst['ebs_max_bandwidth']:
            <span sort="0">N/A</span>
            % else:
            <span sort="${inst['ebs_max_bandwidth']}">
              ${inst['ebs_max_bandwidth']} Mbps  <!-- Not MB/s! -->
            </span>
            % endif
          </td>
          <td class="ebs-throughput">
            <span sort="${inst['ebs_throughput']}">
              ${inst['ebs_throughput']} MB/s
            </span>
          </td>
          <td class="ebs-iops">
            <span sort="${inst['ebs_iops']}">
              ${inst['ebs_iops']} IOPS
            </span>
          </td>
          <td class="maxips">
            % if inst['vpc']:
              ${inst['vpc']['max_enis'] * inst['vpc']['ips_per_eni']}
            % else:
              N/A
            % endif
          </td>
          <td class="enhanced-networking">
            ${'Yes' if inst['enhanced_networking'] else 'No'}
          </td>
          <td class="vpc-only">
            ${'Yes' if inst['vpc_only'] else 'No'}
          </td>
          <td class="ipv6-support">
            ${'Yes' if inst['ipv6_support'] else 'No'}
          </td>
          <td class="linux-virtualization">
            % if inst['linux_virtualization_types']:
            ${', '.join(inst['linux_virtualization_types'])}
            % else:
            Unknown
            % endif
          </td>
          % for platform in ['linux', 'mswin', 'mswinSQLWeb', 'mswinSQL']:
          ## note that the contents in these cost cells are overwritten by the JS change_cost() func, but the initial
          ## data here is used for sorting (and anyone with JS disabled...)
          ## for more info, see https://github.com/powdahound/ec2instances.info/issues/140
          <td class="cost-ondemand cost-ondemand-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',{})).get('ondemand') for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][platform]['ondemand']}">
                $${inst['pricing']['us-east-1'][platform]['ondemand']} hourly
              </span>
            % else:
              <span sort="0">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',{})).get('reserved', {}) for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('reserved', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][platform]['reserved']['yrTerm1Standard.noUpfront']}">
                $${inst['pricing']['us-east-1'][platform]['reserved']['yrTerm1Standard.noUpfront']} hourly
              </span>
            % else:
              <span sort="0">unavailable</span>
            % endif
          </td>
          % endfor
        </tr>
% endfor
      </tbody>
    </table>
