<%!
  active_ = "cache"
  import json
  import six
%>
<%inherit file="base.mako" />

    <%block name="header">
    <h1>EC2Instances.info <small>Easy Amazon <b>ElastiCache</b> Instance Comparison</small></h1>
    <div class='announcement'>Understand your AWS bill with <a href="https://www.vantage.sh/features/cost-reports">Vantage Cost Reports</a> and the <a href="https://handbook.vantage.sh/">Cloud Costs Handbook</a>. Build pricing apps with the <a href="https://vantage.readme.io/reference/general">Vantage API.</a></div>
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
            <li><a href="javascript:;" data-region='af-south-1'>Africa (Cape Town)</a></li>
            <li><a href="javascript:;" data-region='ap-east-1'>Asia-Pacific (Hong Kong)</a></li>
            <li><a href="javascript:;" data-region='ap-south-1'>Asia-Pacific (Mumbai)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-3'>Asia Pacific (Osaka-Local)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-2'>Asia-Pacific (Seoul)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-1'>Asia-Pacific (Singapore)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-2'>Asia-Pacific (Sydney)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-3'>Asia-Pacific (Jakarta)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-1'>Asia-Pacific (Tokyo)</a></li>
            <li><a href="javascript:;" data-region='ca-central-1'>Canada (Central)</a></li>
            <li><a href="javascript:;" data-region='eu-central-1'>Europe (Frankfurt)</a></li>
            <li><a href="javascript:;" data-region='eu-west-1'>Europe (Ireland)</a></li>
            <li><a href="javascript:;" data-region='eu-west-2'>Europe (London)</a></li>
            <li><a href="javascript:;" data-region='eu-west-3'>Europe (Paris)</a></li>
            <li><a href="javascript:;" data-region='eu-north-1'>Europe (Stockholm)</a></li>
            <li><a href="javascript:;" data-region='eu-south-1'>Europe (Milan)</a></li>
            <li><a href="javascript:;" data-region='me-south-1'>Middle East (Bahrain)</a></li>
            <li><a href="javascript:;" data-region='sa-east-1'>South America (S&atilde;o Paulo)</a></li>
            <li><a href="javascript:;" data-region='us-east-1'>US East (N. Virginia)</a></li>
            <li><a href="javascript:;" data-region='us-east-2'>US East (Ohio)</a></li>
            <li><a href="javascript:;" data-region='us-west-1'>US West (Northern California)</a></li>
            <li><a href="javascript:;" data-region='us-west-2'>US West (Oregon)</a></li>
            <li><a href="javascript:;" data-region='us-gov-west-1'>AWS GovCloud (US-West)</a></li>
            <li><a href="javascript:;" data-region='us-gov-east-1'>AWS GovCloud (US-East)</a></li>
          </ul>
        </div>

        <div class="btn-group" id="pricing-unit-dropdown">
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-shopping-cart icon-white"></i>
            Pricing Unit: <span class="text"></span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a href="javascript:;" pricing-unit="instance">Instance</a></li>
            <li><a href="javascript:;" pricing-unit="vcpu">vCPU</a></li>
            <li><a href="javascript:;" pricing-unit="memory">Memory</a></li>
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

    <div class="pull-left form-inline" id="filters">
      <strong> Filter:</strong>
      Min Memory (GiB): <input data-action="datafilter" data-type="memory" class="form-control" />
      Min vCPUs: <input data-action="datafilter" data-type="vcpus" class="form-control" />
    </div>

    <table cellspacing="0" class="table table-bordered table-hover table-condensed" id="data">
      <thead>
        <tr>
          <th class="name">Name</th>
          <th class="apiname">API Name</th>
          <th class="memory">Memory</th>
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="networkperf">Network Performance</th>
          % for cache_engine in {'Redis', 'Memcached'}:
          <th class="cost-ondemand cost-ondemand-${cache_engine}">${cache_engine} On Demand cost</th>
          <th class="cost-reserved cost-reserved-${cache_engine}">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>${cache_engine} Reserved cost</abbr>
          </th>
          % endfor
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
          <td class="networkperf">
            <span sort="${inst['network_sort']}">
              ${inst['network_performance']}
            </span>
          </td>
          % for cache_engine in {'Redis', 'Memcached'}:
          <td class="cost-ondemand cost-ondemand-${cache_engine}" data-platform='${cache_engine}' data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get(cache_engine, {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][cache_engine]['ondemand']}">
                $${inst['pricing']['us-east-1'][cache_engine]['ondemand']} per hour
              </span>
            % else:
              <span sort="0">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-${cache_engine}" data-platform='${cache_engine}' data-vcpu='${inst['vcpu']}' data-memory='${inst['memory']}'>
            % if inst['pricing'].get('us-east-1', {}).get(cache_engine, {}).get('reserved', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][cache_engine]['reserved'].get('yrTerm1Standard.noUpfront')}">
                $${inst['pricing']['us-east-1'][cache_engine]['reserved'].get('yrTerm1Standard.noUpfront')} per hour
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
