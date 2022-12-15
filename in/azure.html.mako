<%!
  active_ = "azure"
  import json
  import six
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>Azure VM Comparison</title>
        <meta name="description" content="A free and easy-to-use tool for comparing Azure VM features and prices."></head>
    </%block>
    

    <div class="row mt-3 me-2" id="menu">
      <div class="col-sm-12 ms-2">

        <div class="btn-group-vertical" id='region-dropdown'>
          <label class="dropdown-label mb-1">Region</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">(US) East US</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" data-region='eastus'>(US) East US</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eastus2'>(US) East US 2</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='southcentralus'>(US) South Central US</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='westus2'>(US) West US 2</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='westus3'>(US) West US 3</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='australiaeast'>(Asia Pacific) Australia East</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='southeastasia'>(Asia Pacific) Southeast Asia
            <li><a class="dropdown-item" href="javascript:;" data-region='northeurope'>(Europe) North Europe</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='swedencentral'>(Europe) Sweden Central</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='uksouth'>(Europe) UK South</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='westeurope'>(Europe) West Europe</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='centralus'>(US) Central US</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='southafricanorth'>(Africa) South Africa North</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='centralindia'>(Asia Pacific) Central India</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eastasia'>(Asia Pacific) East Asia</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='japaneast'>(Asia Pacific) Japan East</a><li>
            <li><a class="dropdown-item" href="javascript:;" data-region='koreacentral'>(Asia Pacific) Korea Central</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='canadacentral'>(Canada) Canada Central</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='francecentral'>(Europe) France Central</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='germanywestcentral'>(Europe) Germany West Central</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='norwayeast'>(Europe) Norway East</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='switzerlandnorth'>(Europe) Switzerland North</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='uaenorth'>(Middle East) UAE North</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='brazilsouth'>(South America) Brazil South</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eastus2euap'>(US) East US 2 EUAP</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='qatarcentral'>(Middle East) Qatar Central</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='centralusstage'>(US) Central US (Stage)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eastusstage'>(US) East US (Stage)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='eastus2stage'>(US) East US 2 (Stage)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='northcentralusstage'>(US) North Central US (Stage)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='southcentralusstage'>(US) South Central US (Stage)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='westusstage'>(US) West US (Stage)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-region='westus2stage'>(US) West US 2 (Stage)</a></li>
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
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="acu">ACU</a></li>
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
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.allUpfront'>1-year - Full Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.allUpfront'>3-year - Full Upfront</a></li>
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
            <abbr title="One EC2 Compute Unit provides the equivalent CPU capacity of a 1.0-1.2 GHz 2007 Opteron or 2007 Xeon processor.">Compute Units (ACU)</abbr>
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
          <th class="ecu-per-vcpu">ACU per vCPU</th>
          <th class="physical_processor">Physical Processor</th>
          <th class="clock_speed_ghz">Clock Speed(GHz)</th>
          <th class="storage">Instance Storage</th>
          <th class="architecture">Arch</th>
          <th class="networkperf">Network Performance</th>
          <th class="linux-virtualization">Linux Virtualization</th>
          <th class="azs">
            <abbr title="The AZ IDs where these instances are available, which is a unique and consistent identifier for an Availability Zone across Azure accounts.">Availability Zones</abbr>
          </th>

          <th class="cost-ondemand cost-ondemand-linux">Linux On Demand cost</th>
          <th class="cost-reserved cost-reserved-linux">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-linux">Linux Spot cost</th>

          <th class="cost-ondemand cost-ondemand-windows">Windows On Demand cost</th>
          <th class="cost-reserved cost-reserved-windows">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-windows">Windows Spot cost</th>

        </tr>
      </thead>

      <tbody>
        % for inst in instances:
          <tr class='instance' id="${inst['instance_type']}">
            <td class="name">${inst['pretty_name']}</td>
            <td class="apiname"><a href="/azure/vm/${inst['instance_type']}">${inst['instance_type']}</a></td>
            <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
            <td class="computeunits">
              <span sort="${inst['ACU']}">${"%s" % (inst['ACU'],)} units</span>
            </td>
            <td class="vcpus">
              <span sort="${inst['vcpu']}">
                ${inst['vcpu']} vCPUs
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
            <td class="acu-per-vcpu">
              % if inst['ACU_per_vcpu'] == 'unknown':
              <span sort="0">unknown</span>
              % else:
              <span sort="${inst['ACU_per_vcpu']}">${"%.4g" % inst['ACU_per_vcpu']} units</span>
              % endif
            </td>
            <td class="physical_processor">${inst['physical_processor'] or 'unknown'}</td>
            <td class="clock_speed_ghz">${inst['clock_speed_ghz'] or 'unknown'}</td>
            <td class="storage">
              <% storage = inst['storage'] %>
              % if not storage:
              <span sort="0">EBS only</span>
              % else:
              <span sort="${storage['size']}">
                ${storage['size']}
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
              <span sort="${inst['network_performance']}">
                ${inst['network_performance']}
              </span>
            </td>
            <td class="azs">
              ${', '.join(inst.get('availability_zones', {}).get('eastus', []))}
            </td>
            
            % for platform in ['linux', 'windows',]:
              ## note that the contents in these cost cells are overwritten by the JS change_cost() func, but the initial
              ## data here is used for sorting (and anyone with JS disabled...)
              ## for more info, see https://github.com/powdahound/ec2instances.info/issues/140
              <td class="cost-ondemand cost-ondemand-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-ecu="${inst['ACU']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('eastus', {}).get(platform, {}).get('ondemand', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['eastus'][platform]['ondemand']}">
                    $${"{:.4f}".format(float(inst['pricing']['eastus'][platform]['ondemand']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              <td class="cost-reserved cost-reserved-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-ecu="${inst['ACU']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('eastus', {}).get(platform, {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['eastus'][platform]['reserved'].get('yrTerm1Standard.noUpfront', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['eastus'][platform]['reserved']['yrTerm1Standard.noUpfront']}">
                    $${"{:.4f}".format(float(inst['pricing']['eastus'][platform]['reserved']['yrTerm1Standard.noUpfront']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              % if platform in ['linux', 'windows']:
                <td class="cost-spot-min cost-spot-min-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-ecu="${inst['ACU']}" data-memory="${inst['memory']}">
                  % if inst['pricing'].get('eastus', {}).get(platform, {}).get('spot', 'N/A') != 'N/A':
                    <%
                        spot = inst['pricing']['eastus'][platform]['spot']
                    %>
                    <span sort="${spot}">
                      $${"{:.4f}".format(float(spot))} hourly
                    </span>
                  % else:
                    <span sort="999999">unavailable</span>
                  % endif
                </td>

              % endif
            % endfor

          </tr>
        % endfor
      </tbody>
    </table>

    <div class="mt-4 pt-4 mb-4 d-flex flex-container justify-content-center">
      <div class="row">
        <div class="d-flex justify-content-center"><span><img width="64" height="64" src="/vantage-logo.svg"></span></div>
        <div class="d-flex justify-content-center mt-4">
          <span class="fw-semibold" style="color:#6c757d">Concerned about your cloud costs? <a href="https://console.vantage.sh/signup">Connect your Azure account</a> in under 5 minutes to see savings.</span>
        </div>
      </div>
    </div>

  </div>

  <%block name="header">
    <h1 class="page-h1">Easy <b>Azure VM</b> Comparison</h1>
  </%block>