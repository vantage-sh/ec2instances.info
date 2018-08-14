<%!
  active_ = "rds"
  import json
%>
<%inherit file="base.mako" />

    <%block name="header">
    <h1>EC2Instances.info <small>Easy Amazon <b>RDS</b> Instance Comparison</small></h1>
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
            <li><a href="javascript:;" data-region='us-gov-west-1'>AWS GovCloud (US)</a></li>
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
            <li><a href="javascript:;" data-reserved-term='yrTerm1.noUpfront'>1 yr - No Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm1.partialUpfront'>1 yr - Partial Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm1.allUpfront'>1 yr - Full Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm3.partialUpfront'>3 yr - Partial Upfront</a></li>
            <li><a href="javascript:;" data-reserved-term='yrTerm3.allUpfront'>3 yr - Full Upfront</a></li>
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
          <th class="storage">Storage</th>
          <th class="ebs-throughput">EBS Throughput</th>
          <th class="processor">Processor</th>
          <th class="vcpus">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="networkperf">Network Performance</th>
          <th class="arch">Arch</th>
          % for platform in ['Aurora PostgreSQL', 'Aurora MySQL', 'MariaDB', 'MySQL', 'Oracle','PostgreSQL', 'SQL Server']:
          <th class="cost-ondemand cost-ondemand-${platform}">${platform} On Demand cost</th>
          <th class="cost-reserved cost-reserved-${platform}">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>${platform} Reserved cost</abbr>
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
          <td class="storage">
          <% storage = inst['storage'] %>
          % if storage == 'EBS Only':
          <span sort="0">0 GiB (EBS only)</span>
          % else:
          <span sort="0">${inst['storage']}</span>
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
          <td class="processor">${inst['physicalProcessor']}</td>
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
          % for platform in ['Aurora PostgreSQL', 'Aurora MySQL', 'MariaDB', 'MySQL', 'Oracle','PostgreSQL', 'SQL Server']:
          <td class="cost-ondemand cost-ondemand-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',{})).get('ondemand') for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('ondemand', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][platform]['ondemand']}">
                $${inst['pricing']['us-east-1'][platform]['ondemand']} per hour
              </span>
            % else:
              <span sort="0">unavailable</span>
            % endif
          </td>
          <td class="cost-reserved cost-reserved-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',{})).get('reserved', {}) for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('reserved', 'N/A') != "N/A":
              <span sort="${inst['pricing']['us-east-1'][platform]['reserved'].get('yrTerm1.noUpfront')}">
                $${inst['pricing']['us-east-1'][platform]['reserved'].get('yrTerm1.noUpfront')} per hour
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
