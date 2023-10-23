<%!
  active_ = "opensearch"
  import json
  import six
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>Amazon OpenSearch, Open-Source Elasticsearch, Instance Comparison</title>
        <meta name="description" content="A free and easy-to-use tool for comparing OpenSearch Instance features and prices."></head>
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
          <ul class="dropdown-menu region-list-dropdown" role="menu">
            <li>
              <input type="text" id="dropdown-search" class="ms-2 mb-2 form-control dropdown-search" placeholder="Search" />
            </li>
            % for region, region_name in regions["main"].items():
            <li>
              <a class="dropdown-item" href="javascript:;" data-region='${region}'>
                <span>${region_name}</span>
                <span class="dropdown-region">${region}</span>
              </a>
            </li>
            % endfor
          </ul>
        </div>

        <div class="btn-group-vertical d-none d-md-inline-flex" id="pricing-unit-dropdown">
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

        <div class="btn-group-vertical d-none d-md-inline-flex" id='reserved-term-dropdown'>
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
            data-text-off="Compare">
            Compare
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
          <input id="fullsearch" type="text" class="form-control d-none d-xl-block" placeholder="Search...">
        </div>

        <div class="btn-group-vertical float-end px-2">
          <label class="dropdown-label mb-1"><br></label>
          <div class="btn-primary" id="export"></div>
        </div>

      </div>
    </div>

  <div class="table-responsive overflow-auto wrap-table flex-fill">
    <table cellspacing="0" style="border-bottom: 0 !important; margin-bottom: 0 !important;" id="data" width="100%" class="table">
      <thead>
        <tr>
          <th class="name all" data-priority="1"><div class="d-none d-md-block">Name</div></th>
          <th class="apiname all" data-priority="1">API Name</th>
          <th class="memory">Memory</th>
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="storage">Storage</th>
          <th class="ecu-per-vcpu">Elastic Compute Units</th>
          <th class="cost-ondemand cost-ondemand-search all" data-priority="1">On Demand cost</th>
          <th class="cost-reserved cost-reserved-search">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Reserved cost</abbr>
          </th>
          <th class="generation">Generation</th>
        </tr>
      </thead>

      <tbody>
        % for inst in instances:
        <tr class='instance' id="${inst['instance_type']}">
          <td class="name all" data-priority="1"><div class="d-none d-md-block">${inst['pretty_name']}</div></td>
          <td class="apiname all" data-priority="1"><a href="/aws/opensearch/${inst['instance_type']}">${inst['instance_type']}</a></td>
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
          <td class="vcpus">
            <span sort="${inst['vcpu']}">
              ${inst['vcpu']} vCPUs
            </span>
          </td>
          <td class="storage"><span sort="${inst['storage']}">${inst['storage']}</span></td>
          <td class="ecu-per-vcpu"><span sort="${inst['ecu']}">${inst['ecu']}</span></td>
          <td class="cost-ondemand cost-ondemand-search all" data-platform="none" data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}' data-priority="1">
            % if inst['pricing'].get('us-east-1', {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1']['ondemand']}">
                $${"{:.4f}".format(float(inst['pricing']['us-east-1']['ondemand']))} hourly
              </span>
            % else:
              <span sort="999999">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-search" data-platform="none" data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east-1']['reserved'].get('yrTerm1Standard.noUpfront', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1']['reserved'].get('yrTerm1Standard.noUpfront')}">
                $${"{:.4f}".format(float(inst['pricing']['us-east-1']['reserved'].get('yrTerm1Standard.noUpfront')))} hourly
              </span>
            % else:
              <span sort="999999">unavailable</span>
            % endif
          </td>
          <td class="generation">
              ${'current' if inst['currentGeneration'] == 'Yes' else 'previous'}
          </td>
        </tr>
        % endfor
      </tbody>
    </table>

    <div class="mt-4 pt-4 mb-4 d-flex flex-container justify-content-center">
      <div class="d-none d-lg-block">
      <div class="vantage-callout" style="min-width:640px">
        <div class="callout-close">
          <span class="material-icons">close</span>
        </div>
        <img width="auto" height="25" src="/vantage-logo_full.svg">
        <h5>Concerned about cloud costs?</h5>
        <p>Connect your AWS account in under<br />5 minutes to see savings.</p>
        <a href="https://console.vantage.sh/signup" target="_blank">Connect AWS Account</a>
      </div>
      </div>
    </div>

  </div>

  <%block name="header">
    <h1 class="page-h1">EC2Instances.info Easy Amazon <b>OpenSearch</b> Instance Comparison</h1>
  </%block>