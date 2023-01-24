<%!
  active_ = "ec2"
  import json
  import six
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>Amazon EC2 Instance Comparison</title>
        <meta name="description" content="A free and easy-to-use tool for comparing EC2 Instance features and prices."></head>
    </%block>
    
    <%block name="header">
      <h1 class="banner-ad">EC2Instances.info - Easy Amazon <b>EC2</b> Instance Comparison</h1>
    </%block>

    <div class="row mt-3 me-2" id="menu">
      <div class="col-sm-12 ms-2">

        <div class="btn-group-vertical" id='region-dropdown'>
          <label class="dropdown-label mb-1">Region</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">US East (N. Virginia)</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" data-region='af-south-1'>Africa (Cape Town)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-east-1'>Asia-Pacific (Hong Kong)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-south-1'>Asia-Pacific (Mumbai)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-south-2'>Asia-Pacific (Hyderabad)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-northeast-3'>Asia Pacific (Osaka-Local)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-northeast-2'>Asia-Pacific (Seoul)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-southeast-1'>Asia-Pacific (Singapore)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-southeast-2'>Asia-Pacific (Sydney)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-southeast-3'>Asia-Pacific (Jakarta)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-southeast-4'>Asia-Pacific (Melbourne)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ap-northeast-1'>Asia-Pacific (Tokyo)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='ca-central-1'>Canada (Central)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-central-1'>Europe (Frankfurt)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-central-2'>Europe (Zurich)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-west-1'>Europe (Ireland)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-west-2'>Europe (London)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-west-3'>Europe (Paris)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-north-1'>Europe (Stockholm)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-south-1'>Europe (Milan)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eu-south-2'>Europe (Spain)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='me-south-1'>Middle East (Bahrain)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='me-central-1'>Middle East (UAE)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='sa-east-1'>South America (S&atilde;o Paulo)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='us-east-1'>US East (N. Virginia)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='us-east-2'>US East (Ohio)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='us-west-1'>US West (Northern California)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='us-west-2'>US West (Oregon)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='us-gov-west-1'>AWS GovCloud (US-West)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='us-gov-east-1'>AWS GovCloud (US-East)</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id="pricing-unit-dropdown">
          <label class="dropdown-label mb-1">Pricing Unit</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-shopping-cart icon-white"></i>
            <span class="text">Instance</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li class="active"><a class="dropdown-item" href="javascript:;" pricing-unit="instance">Instance</a></li>
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="vcpu">vCPU</a></li>
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="ecu">ECU</a></li>
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="memory">Memory</a></li>
           </ul>
        </div>

        <div class="btn-group-vertical" id="cost-dropdown">
          <label class="dropdown-label mb-1">Cost</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-shopping-cart icon-white"></i>
            <span class="text">Hourly</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" duration="secondly">Per Second</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="minutely">Per Minute</a></li>
            <li class="active"><a class="dropdown-item" href="javascript:;" duration="hourly">Hourly</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="daily">Daily</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="weekly">Weekly</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="monthly">Monthly</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="annually">Annually</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id='reserved-term-dropdown'>
          <label class="dropdown-label mb-1">Reserved</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">1-year - No Upfront</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.noUpfront'>1-year - No Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.partialUpfront'>1-year - Partial Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.allUpfront'>1-year - Full Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.noUpfront'>3-year - No Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.partialUpfront'>3-year - Partial Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.allUpfront'>3-year - Full Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Convertible.noUpfront'>1-year convertible - No Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Convertible.partialUpfront'>1-year convertible - Partial Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Convertible.allUpfront'>1-year convertible - Full Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Convertible.noUpfront'>3-year convertible - No Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Convertible.partialUpfront'>3-year convertible - Partial Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Convertible.allUpfront'>3-year convertible - Full Upfront</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id="filter-dropdown">
          <!-- blank label maintains spacing -->
          <label class="dropdown-label mb-1"><br></label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-filter icon-white"></i>
            Columns
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <!-- table header elements inserted by js -->
          </ul>
        </div>

        <div class="btn-group-vertical">
          <label class="dropdown-label mb-1"><br></label>
          <button class="btn btn-purple btn-compare"
            data-text-on="End Compare"
            data-text-off="Compare Selected">
            Compare Selected
          </button>
        </div>

        <div class="btn-group-vertical">
          <label class="dropdown-label mb-1"><br></label>
          <button class="btn btn-primary btn-clear" id="clear">
            Clear Filters
          </button>
        </div>

        <div class="btn-group-vertical float-end m2 p2" id="search">
          <label class="dropdown-label mb-1"><br></label>
          <input id="fullsearch" type="text" class="form-control" placeholder="Search...">
        </div>

        <div class="btn-group-vertical float-end px-2">
          <label class="dropdown-label mb-1"><br></label>
          <div class="btn-primary" id="export"></div>
        </div>

      </div>
    </div>

  <div class="table-responsive overflow-auto wrap-table flex-fill">
    <table cellspacing="0" class="table" style="border-bottom: 0 !important; margin-bottom: 0 !important;" id="data">
      <thead>
        <tr>
          <th class="name">Name</th>
          <th class="apiname">API Name</th>
          <th class="memory">Instance Memory</th>
          <th class="computeunits">
            <abbr title="One EC2 Compute Unit provides the equivalent CPU capacity of a 1.0-1.2 GHz 2007 Opteron or 2007 Xeon processor.">Compute Units (ECU)</abbr>
          </th>
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="memory-per-vcpu">GiB of Memory per vCPU</th>
          <th class="gpus">GPUs</th>
          <th class="gpu_model">GPU model</th>
          <th class="gpu_memory">GPU memory</th>
          <th class="compute_capability">CUDA Compute Capability</th>
          <th class="fpgas">FPGAs</th>
          <th class="ecu-per-vcpu">ECU per vCPU</th>
          <th class="physical_processor">Physical Processor</th>
          <th class="clock_speed_ghz">Clock Speed(GHz)</th>
          <th class="intel_avx">Intel AVX</th>
          <th class="intel_avx2">Intel AVX2</th>
          <th class="intel_avx512">Intel AVX-512</th>
          <th class="intel_turbo">Intel Turbo</th>
          <th class="storage">Instance Storage</th>
          <th class="warmed-up">Instance Storage: already warmed-up</th>
          <th class="trim-support">Instance Storage: SSD TRIM Support</th>
          <th class="architecture">Arch</th>
          <th class="networkperf">Network Performance</th>
          <th class="ebs-baseline-bandwidth">EBS Optimized: Baseline Bandwidth</th>
          <th class="ebs-baseline-throughput">EBS Optimized: Baseline Throughput (128K)</th>
          <th class="ebs-baseline-iops">EBS Optimized: Baseline IOPS (16K)</th>
          <th class="ebs-max-bandwidth">EBS Optimized: Max Bandwidth</th>
          <th class="ebs-throughput">EBS Optimized: Max Throughput (128K)</th>
          <th class="ebs-iops">EBS Optimized: Max IOPS (16K)</th>
          <th class="ebs-as-nvme">
            <abbr title="EBS volumes on these instances will be exposed as NVMe devices (/dev/nvmeXn1)">EBS Exposed as NVMe</abbr>
          </th>
          <th class="maxips">
            <abbr title="Adding additional IPs requires launching the instance in a VPC.">Max IPs</abbr>
          </th>
          <th class="maxenis">Max ENIs</th>
          <th class="enhanced-networking">Enhanced Networking</th>
          <th class="vpc-only">VPC Only</th>
          <th class="ipv6-support">IPv6 Support</th>
          <th class="placement-group-support">Placement Group Support</th>
          <th class="linux-virtualization">Linux Virtualization</th>
          <th class="emr-support">On EMR</th>
          <th class="azs">
            <abbr title="The AZ IDs where these instances are available, which is a unique and consistent identifier for an Availability Zone across AWS accounts.">Availability Zones</abbr>
          </th>

          <th class="cost-ondemand cost-ondemand-linux">Linux On Demand cost</th>
          <th class="cost-reserved cost-reserved-linux">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-linux">Linux Spot Minimum cost</th>
          <th class="cost-spot-max cost-spot-max-linux">Linux Spot Maximum cost</th>

          <th class="cost-ondemand cost-ondemand-rhel">RHEL On Demand cost</th>
          <th class="cost-reserved cost-reserved-rhel">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>RHEL Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-rhel">RHEL Spot Minimum cost</th>
          <th class="cost-spot-max cost-spot-max-rhel">RHEL Spot Maximum cost</th>

          <th class="cost-ondemand cost-ondemand-sles">SLES On Demand cost</th>
          <th class="cost-reserved cost-reserved-sles">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>SLES Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-sles">SLES Spot Minimum cost</th>
          <th class="cost-spot-max cost-spot-max-sles">SLES Spot Maximum cost</th>

          <th class="cost-ondemand cost-ondemand-mswin">Windows On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswin">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-mswin">Windows Spot Minimum cost</th>
          <th class="cost-spot-max cost-spot-max-mswin">Windows Spot Maximum cost</th>

          <th class="cost-ondemand cost-ondemand-dedicated">Dedicate Host On Demand</th>
          <th class="cost-reserved cost-reserved-dedicated">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Dedicated Host Reserved</abbr>
          </th>

          <th class="cost-ondemand cost-ondemand-mswinSQLWeb">Windows SQL Web On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswinSQLWeb">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows SQL Web Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-mswinSQL">Windows SQL Std On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswinSQL">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows SQL Std Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-mswinSQLEnterprise">Windows SQL Ent On Demand cost</th>
          <th class="cost-reserved cost-reserved-mswinSQLEnterprise">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows SQL Ent Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-linuxSQLWeb">Linux SQL Web On Demand cost</th>
          <th class="cost-reserved cost-reserved-linuxSQLWeb">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux SQL Web Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-linuxSQL">Linux SQL Std On Demand cost</th>
          <th class="cost-reserved cost-reserved-linuxSQL">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux SQL Std Reserved cost</abbr>
          </th>
          <th class="cost-ondemand cost-ondemand-linuxSQLEnterprise">Linux SQL Ent On Demand cost</th>
          <th class="cost-reserved cost-reserved-linuxSQLEnterprise">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux SQL Ent Reserved cost</abbr>
          </th>
          <th class="cost-ebs-optimized">
            <abbr title='Some instance types are charged additionally when configured for optimized EBS usage'>EBS Optimized surcharge</abbr>
          </th>
          <th class="cost-emr">
            <abbr title="This are the hourly rate EMR costs. Actual costs are EC2 + EMR by hourly rate">EMR cost</abbr>
          </th>
          <th class="generation">Generation</th>
        </tr>
      </thead>

      <tbody>
        % for inst in instances:
          <tr class='instance' id="${inst['instance_type']}">
            <td class="name">${inst['pretty_name']}</td>
            <td class="apiname"><a href="/aws/ec2/${inst['instance_type']}">${inst['instance_type']}</a></td>
            <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
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
            <td class="memory-per-vcpu">
              % if inst['memory_per_vcpu'] == 'unknown':
              <span sort="999999">unknown</span>
              % else:
              <span sort="${inst['memory_per_vcpu']}">${"{:.2f}".format(inst['memory_per_vcpu'])} GiB/vCPU</span>
              % endif
            </td>
            <td class="gpus">
              <span sort="${inst['GPU']}">
                ${inst['GPU']}
              </span>
            </td>
            <td class="gpu_model">${inst['GPU_model']}</td>
            <td class="gpu_memory">
              <span sort="${inst['GPU_memory']}">
                ${inst['GPU_memory']} GiB
              </span>
            </td>
            <td class="compute_capability">${inst['compute_capability']}</td>
            <td class="fpga">${inst['FPGA']}</td>
            <td class="ecu-per-vcpu">
              % if inst['ECU'] == 'variable':
              <span sort="0"><a href="http://aws.amazon.com/ec2/instance-types/#burst" target="_blank">Burstable</a></span>
              % elif inst['ECU_per_vcpu'] == 'unknown':
              <span sort="0">unknown</span>
              % else:
              <span sort="${inst['ECU_per_vcpu']}">${"%.4g" % inst['ECU_per_vcpu']} units</span>
              % endif
            </td>
            <td class="physical_processor">${inst['physical_processor'] or 'unknown'}</td>
            <td class="clock_speed_ghz">${inst['clock_speed_ghz'] or 'unknown'}</td>
            <td class="intel_avx">${'Yes' if inst['intel_avx'] else 'unknown'}</td>
            <td class="intel_avx2">${'Yes' if inst['intel_avx2'] else 'unknown'}</td>
            <td class="intel_avx512">${'Yes' if inst['intel_avx512'] else 'unknown'}</td>
            <td class="intel_turbo">${'Yes' if inst['intel_turbo'] else 'unknown'}</td>
            <td class="storage">
              <% storage = inst['storage'] %>
              % if not storage:
              <span sort="0">EBS only</span>
              % else:
              <span sort="${storage['devices']*storage['size']}">
                ${storage['devices'] * storage['size']} ${storage['size_unit']}
                % if storage['devices'] > 1:
                (${storage['devices']} * ${storage['size']} ${storage['size_unit']} ${"NVMe " if storage['nvme_ssd'] else ''}${"SSD" if storage['ssd'] else 'HDD'})
                % else:
                ${"NVMe " if storage['nvme_ssd'] else ''}${"SSD" if storage['ssd'] else 'HDD'}
                % endif
                ${"+ 900MB swap" if storage['includes_swap_partition'] else ''}
              </span>
              % endif
            </td>
            <td class="warmed-up">
              % if inst['storage']:
                  ${"No" if inst['storage']['storage_needs_initialization'] else 'Yes'}
              % else:
                  N/A
              % endif
            </td>
            <td class="trim-support">
              % if inst['storage'] and inst['storage']['ssd'] :
                  ${"Yes" if inst['storage']['trim_support'] else 'No'}
              % else:
                  N/A
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
            <td class="ebs-baseline-bandwidth">
              % if not inst['ebs_baseline_bandwidth']:
              <span sort="0">N/A</span>
              % else:
              <span sort="${inst['ebs_baseline_bandwidth']}">
                ${inst['ebs_baseline_bandwidth']} Mbps  <!-- Not MB/s! -->
              </span>
              % endif
            </td>
            <td class="ebs-baseline-throughput">
              <span sort="${inst['ebs_baseline_throughput']}">
                ${inst['ebs_baseline_throughput']} MB/s
              </span>
            </td>
            <td class="ebs-baseline-iops">
              <span sort="${inst['ebs_baseline_iops']}">
                ${inst['ebs_baseline_iops']} IOPS
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
            <td class="ebs-as-nvme">
              % if inst['ebs_as_nvme']:
                  Yes
              % else:
                  No
              % endif
            </td>
            <td class="maxips">
              % if inst['vpc']:
                ${inst['vpc']['max_enis'] * inst['vpc']['ips_per_eni']}
              % else:
                N/A
              % endif
            </td>
            <td class="maxenis">
              % if inst['vpc']:
                <span sort="${inst['vpc']['max_enis']}">${inst['vpc']['max_enis']}</span>
              % else:
                <span sort="0">N/A</span>
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
            <td class="placement-group-support">
              ${'Yes' if inst['placement_group_support'] else 'No'}
            </td>
            <td class="linux-virtualization">
              % if inst['linux_virtualization_types']:
              ${', '.join(inst['linux_virtualization_types'])}
              % else:
              Unknown
              % endif
            </td>
            <td class="emr-support">
              ${'Yes' if inst['emr'] else 'No'}
            </td>
            <td class="azs">
              ${', '.join(inst.get('availability_zones', {}).get('us-east-1', []))}
            </td>
            
            % for platform in ['linux', 'rhel', 'sles', 'mswin', 'dedicated', 'mswinSQLWeb', 'mswinSQL', 'mswinSQLEnterprise', 'linuxSQLWeb', 'linuxSQL', 'linuxSQLEnterprise']:
              ## note that the contents in these cost cells are overwritten by the JS change_cost() func, but the initial
              ## data here is used for sorting (and anyone with JS disabled...)
              ## for more info, see https://github.com/powdahound/ec2instances.info/issues/140
              <td class="cost-ondemand cost-ondemand-${platform}" data-platform="${platform}" data-vcpu="${inst['vCPU']}" data-ecu="${inst['ECU']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('ondemand', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['us-east-1'][platform]['ondemand']}">
                    $${"{:.4f}".format(float(inst['pricing']['us-east-1'][platform]['ondemand']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              <td class="cost-reserved cost-reserved-${platform}" data-platform="${platform}" data-vcpu="${inst['vCPU']}" data-ecu="${inst['ECU']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east-1'][platform]['reserved'].get('yrTerm1Standard.noUpfront', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['us-east-1'][platform]['reserved']['yrTerm1Standard.noUpfront']}">
                    $${"{:.4f}".format(float(inst['pricing']['us-east-1'][platform]['reserved']['yrTerm1Standard.noUpfront']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              % if platform in ['linux', 'rhel', 'sles', 'mswin']:
                <td class="cost-spot-min cost-spot-min-${platform}" data-platform="${platform}" data-vcpu="${inst['vCPU']}" data-ecu="${inst['ECU']}" data-memory="${inst['memory']}">
                  % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('spot_min', 'N/A') != 'N/A':
                    <%
                        spot_min = inst['pricing']['us-east-1'][platform]['spot_min']
                    %>
                    <span sort="${spot_min}">
                      $${"{:.4f}".format(float(spot_min))} hourly
                    </span>
                  % else:
                    <span sort="999999">unavailable</span>
                  % endif
                </td>

                <td class="cost-spot-max cost-spot-max-${platform}" data-platform="${platform}" data-vcpu="${inst['vCPU']}" data-ecu="${inst['ECU']}" data-memory="${inst['memory']}">
                  %if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('spot_max', 'N/A') != 'N/A':
                    <%
                      spot_max = inst['pricing']['us-east-1'][platform]['spot_max']
                    %>
                    <span sort="${spot_max}">
                      $${"{:.4f}".format(float(spot_max))} hourly
                    </span>
                  % else:
                    <span sort="999999">unavailable</span>
                  % endif
                </td>
              % endif
            % endfor

            <td class="cost-ebs-optimized" data-vcpu="${inst['vCPU']}" data-ecu="${inst['ECU']}" data-memory="${inst['memory']}">
              % if inst['ebs_max_bandwidth']:
                % if inst['pricing'].get('us-east-1', {}).get('ebs', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['us-east-1']['ebs']}">
                    $${"{:.4f}".format(float(inst['pricing']['us-east-1']['ebs']))} hourly
                  </span>
                % else:
                  <span sort="0">0</span>
                % endif
              % else:
                <span sort="999999">unavailable</span>
              % endif
            </td>
            <td class="cost-emr" data-vcpu="${inst['vCPU']}" data-ecu="${inst['ECU']}" data-memory="${inst['memory']}">
              % if inst['pricing'].get('us-east-1', {}).get("emr", {}):
                <span sort="${inst['pricing']['us-east-1']['emr']['emr']}">
                  $${"{:.4f}".format(float(inst['pricing']['us-east-1']["emr"]['emr']))} hourly
                </span>
              % else:
                <span sort="999999">unavailable</span>
              % endif
            </td>
            <td class="generation">${inst['generation']}</td>
          </tr>
        % endfor
      </tbody>
    </table>
  </div>
