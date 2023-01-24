<%!
  active_ = "rds"
  import json
  import six
%>
<%inherit file="base.mako" />

    <%block name="meta">
      <title>Amazon RDS Instance Comparison</title>
      <meta name="description" content="A free and easy-to-use tool for comparing RDS Instance features and prices."></head>
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
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="memory">Memory</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id="cost-dropdown">
          <label class="dropdown-label mb-1">Cost</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" href="#">
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
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">1 yr - No Upfront</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.noUpfront'>1 yr - No Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.partialUpfront'>1 yr - Partial Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.allUpfront'>1 yr - Full Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.partialUpfront'>3 yr - Partial Upfront</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.allUpfront'>3 yr - Full Upfront</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id="filter-dropdown">
          <!-- blank label maintains spacing -->
          <label class="dropdown-label mb-1"><br></label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" href="#">
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
          <th class="memory">Memory</th>
          <th class="storage">Storage</th>
          <th class="ebs-throughput">EBS Throughput</th>
          <th class="physical_processor">Processor</th>
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="networkperf">Network Performance</th>
          <th class="architecture">Arch</th>
          % for platform, code in {'PostgreSQL': '14', 'MySQL': '2', 'SQL Server Standard': '12', 'Aurora PostgreSQL': '21', 'Aurora MySQL': '16', 'MariaDB': '18', 'Oracle Enterprise': '5'}.items():
          <th class="cost-ondemand cost-ondemand-${code}">${platform} On Demand cost</th>
          <th class="cost-reserved cost-reserved-${code}">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>${platform} Reserved cost</abbr>
          </th>
          % endfor
        </tr>
      </thead>
      <tbody>
        % for inst in instances:
        <tr class='instance' id="${inst['instance_type']}">
          <td class="name">${inst['pretty_name']}</a></td>
          <td class="apiname"><a href="/aws/rds/${inst['instance_type']}">${inst['instance_type']}</a></td>
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
          <td class="storage">
          <% storage = inst['storage'] %>
          % if storage == 'EBS Only':
          <span sort="0">0 GiB (EBS only)</span>
          % else:
          <% products = [int(s) for s in storage.split() if s.isdigit()] %>
          <span sort="${products[0]*products[1]}">${inst['storage']}</span>
          % endif
          </td>
          <td class="ebs-throughput">
          % if 'dedicatedEbsThroughput' not in inst:
          <span sort="0">N/A</span>
          % else:
          <span sort="${inst['dedicatedEbsThroughput']}">
            ${inst['dedicatedEbsThroughput']}
          </span>
          % endif
          <td class="physical_processor">${inst['physicalProcessor']}</td>
          <td class="vcpus">
            <span sort="${inst['vcpu']}">
              ${inst['vcpu']} vCPUs
            </span>
          </td>
          <td class="networkperf">
            <span sort="${inst['network_sort']}">
              ${inst['network_performance']}
            </span>
          </td>
          <td class="architecture">
            % if 'i386' in inst['arch']:
            32/64-bit
            % else:
            64-bit
            % endif
          </td>
          % for platform, code in {'PostgreSQL': '14', 'MySQL': '2', 'SQL Server Standard': '12', 'Aurora PostgreSQL': '21', 'Aurora MySQL': '16', 'MariaDB': '18', 'Oracle Enterprise': '5'}.items():
          <td class="cost-ondemand cost-ondemand-${code}" data-platform='${code}' data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get(code, {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][code]['ondemand']}">
                $${"{:.4f}".format(float(inst['pricing']['us-east-1'][code]['ondemand']))} hourly
              </span>
            % else:
              <span sort="999999">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-${code}" data-platform='${code}' data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get(code, {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east-1'][code]['reserved'].get('yrTerm1Standard.noUpfront', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][code]['reserved'].get('yrTerm1Standard.noUpfront')}">
                $${"{:.4f}".format(float(inst['pricing']['us-east-1'][code]['reserved'].get('yrTerm1Standard.noUpfront')))} hourly
              </span>
            % else:
              <span sort="999999">unavailable</span>
            % endif
          </td>
          % endfor
        </tr>
        % endfor
      </tbody>
    </table>

    <div class="mt-4 pt-4 mb-4 d-flex flex-container justify-content-center">
      <div class="row">
        <div class="d-flex justify-content-center"><span><img width="64" height="64" src="/vantage-logo.svg"></span></div>
        <div class="d-flex justify-content-center mt-4">
          <span class="fw-semibold" style="color:#6c757d">Concerned about your cloud costs? <a href="https://console.vantage.sh/signup">Connect your AWS account</a> in under 5 minutes to see savings.</span>
        </div>
      </div>
    </div>

  </div>

  <%block name="header">
    <h1 class="page-h1">EC2Instances.info Easy Amazon <b>RDS</b> Instance Comparison</h1>
  </%block>