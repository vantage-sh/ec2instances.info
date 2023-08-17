<%!
  active_ = "cache"
  import json
  import six
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>Amazon ElastiCache Instance Comparison</title>
        <meta name="description" content="A free and easy-to-use tool for comparing ElastiCache Instance features and prices."></head>
    </%block>

    <%block name="header">
      <h1 class="banner-ad d-none d-xl-block">EC2Instances.info Easy Amazon <b>ElastiCache</b> Instance Comparison</h1>
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
          <th class="networkperf">Network Performance</th>
          % for cache_engine in {'Redis', 'Memcached'}:
          % if cache_engine == 'Redis':
          <th class="cost-ondemand cost-ondemand-${cache_engine} all" data-priority="1">${cache_engine} Cost</th>
          % else:
          <th class="cost-ondemand cost-ondemand-${cache_engine}">${cache_engine} On Demand cost</th>
          % endif
          <th class="cost-reserved cost-reserved-${cache_engine}">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>${cache_engine} Reserved cost</abbr>
          </th>
          % endfor
          <th class="generation">Generation</th>
        </tr>
      </thead>

      <tbody>
        % for inst in instances:
        <tr class='instance' id="${inst['instance_type']}">
          <td class="name all" data-priority="1"><div class="d-none d-md-block">${inst['pretty_name']}</div></td>
          <td class="apiname all" data-priority="1"><a href="/aws/elasticache/${inst['instance_type']}">${inst['instance_type']}</a></td>
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
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
          % for cache_engine in {'Redis', 'Memcached'}:
          <td class="cost-ondemand cost-ondemand-${cache_engine}" data-platform='${cache_engine}' data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get(cache_engine, {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][cache_engine]['ondemand']}">
                $${inst['pricing']['us-east-1'][cache_engine]['ondemand']} hourly
              </span>
            % else:
              <span sort="999999">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-${cache_engine}" data-platform='${cache_engine}' data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get(cache_engine, {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east-1'][cache_engine]['reserved'].get('yrTerm1Standard.noUpfront', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][cache_engine]['reserved'].get('yrTerm1Standard.noUpfront')}">
                $${inst['pricing']['us-east-1'][cache_engine]['reserved'].get('yrTerm1Standard.noUpfront')} hourly
              </span>
            % else:
              <span sort="999999">unavailable</span>
            % endif
          </td>
          % endfor
          <td class="generation">
              ${'current' if inst['currentGeneration'] == 'Yes' else 'previous'}
          </td>
        </tr>
        % endfor
      </tbody>
    </table>
  </div>
