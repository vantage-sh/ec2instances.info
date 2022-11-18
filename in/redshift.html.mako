<%!
  active_ = "redshift"
  import json
  import six
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>Amazon Redshift Instance Comparison</title>
        <meta name="description" content="A free and easy-to-use tool for comparing Redshift Instance features and prices."></head>
    </%block>

    <%block name="header">
      <h1 class="banner-ad">EC2Instances.info Easy Amazon <b>Redshift</b> Instance Comparison</h1>
    </%block>

    <div class="row mt-3 me-2" id="menu">
      <div class="col-sm-12 ms-2">

        <div class="btn-group-vertical" id='region-dropdown'>
          <label class="dropdown-label mb-1">Region</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">US East (N. Virginia)</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item"  href="javascript:;" data-region='af-south-1'>Africa (Cape Town)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-east-1'>Asia-Pacific (Hong Kong)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-south-1'>Asia-Pacific (Mumbai)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-northeast-3'>Asia Pacific (Osaka-Local)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-northeast-2'>Asia-Pacific (Seoul)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-southeast-1'>Asia-Pacific (Singapore)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-southeast-2'>Asia-Pacific (Sydney)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-southeast-3'>Asia-Pacific (Jakarta)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ap-northeast-1'>Asia-Pacific (Tokyo)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='ca-central-1'>Canada (Central)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-central-1'>Europe (Frankfurt)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-central-2'>Europe (Zurich)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-west-1'>Europe (Ireland)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-west-2'>Europe (London)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-west-3'>Europe (Paris)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-north-1'>Europe (Stockholm)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-south-1'>Europe (Milan)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='eu-south-2'>Europe (Spain)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='me-south-1'>Middle East (Bahrain)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='me-central-1'>Middle East (UAE)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='sa-east-1'>South America (S&atilde;o Paulo)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='us-east-1'>US East (N. Virginia)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='us-east-2'>US East (Ohio)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='us-west-1'>US West (Northern California)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='us-west-2'>US West (Oregon)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='us-gov-west-1'>AWS GovCloud (US-West)</a></li>
            <li><a class="dropdown-item"  href="javascript:;" data-region='us-gov-east-1'>AWS GovCloud (US-East)</a></li>
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
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.noUpfront'>3 yr - No Upfront</a></li>
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
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="storage">Storage</th>
          <th class="io">I/O</th>
          <th class="ecu-per-vcpu">Elastic Compute Units</th>
          <th class="generation">Current Generation</th>
          <th class="cost-ondemand cost-ondemand-node">Node On Demand cost</th>
          <th class="cost-reserved cost-reserved-node">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Node Reserved cost</abbr>
          </th>
        </tr>
      </thead>

      <tbody>
        % for inst in instances:
        <tr class='instance' id="${inst['instance_type']}">
          <td class="name">${inst['pretty_name']}</td>
          <td class="apiname">${inst['instance_type']}</td>
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
          <td class="vcpus">
            <span sort="${inst['vcpu']}">
              ${inst['vcpu']} vCPUs
            </span>
          </td>
          <td class="storage"><span sort="${inst['storage']}">${inst['storage']}</span></td>
          <td class="io"><span sort="${inst['io']}">${inst['io']}</span></td>
          <td class="ecu-per-vcpu"><span sort="${inst['ecu']}">${inst['ecu']}</span></td>
          <td class="generation"><span sort="${inst['currentGeneration']}">${inst['currentGeneration']}</span></td>
          <td class="cost-ondemand cost-ondemand-node" data-platform="none" data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1']['ondemand']}">
                $${"{:.4f}".format(float(inst['pricing']['us-east-1']['ondemand']))} hourly
              </span>
            % else:
              <span sort="0">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-node" data-platform="none" data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east-1']['reserved'].get('yrTerm1Standard.noUpfront', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1']['reserved'].get('yrTerm1Standard.noUpfront')}">
                $${"{:.4f}".format(float(inst['pricing']['us-east-1']['reserved'].get('yrTerm1Standard.noUpfront')))} hourly
              </span>
            % else:
              <span sort="0">unavailable</span>
            % endif
          </td>
        </tr>
        % endfor
      </tbody>
    </table>
  </div>
