<%!
   import json
%>
<!DOCTYPE html>

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Amazon EC2 Instance Comparison</title>
    <link rel="stylesheet" href="default.css" media="screen">
    <link rel="stylesheet" href="bootstrap/css/bootstrap.min.css" media="screen">
    <link rel="icon" type="image/png" href="favicon.png">
    <script type="text/javascript">
      var _gaq = _gaq || [];
      _gaq.push(['_setAccount', 'UA-4372467-3']);
      _gaq.push(['_trackPageview']);
      (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
      })();
    </script>
  </head>

  <body>
    <div class="page-header">
      <h1>EC2Instances.info <small>Easy Amazon EC2 Instance Comparison</small></h1>
    </div>

    <!--
    <div class="alert">
      <button type="button" class="close" data-dismiss="alert">&times;</button>
      <strong>Warning!</strong> Some information on this page is outdated. Please see <a href="https://github.com/powdahound/ec2instances.info/issues/75">this issue</a> for more detail.
    </div>
    -->

    <div class="row" id="filters">
      <div class="col-sm-12">
        <div class="btn-group" id='region-dropdown'>
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-globe icon-white"></i>
            Region: <span class="text"></span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a href="javascript:;" data-region='us-east-1'>US East</a></li>
            <li><a href="javascript:;" data-region='us-west-1'>US West (Northern California)</a></li>
            <li><a href="javascript:;" data-region='us-west-2'>US West (Oregon)</a></li>
            <li><a href="javascript:;" data-region='sa-east-1'>South America</a></li>
            <li><a href="javascript:;" data-region='eu-west-1'>EU (Ireland)</a></li>
            <li><a href="javascript:;" data-region='eu-central-1'>EU (Frankfurt)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-1'>Asia-Pacific (Singapore)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-2'>Asia-Pacific (Sydney)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-1'>Asia-Pacific (Tokyo)</a></li>
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
            <!-- table header elements inserted by js -->
          </ul>
        </div>

        <div class="btn-group" id="url-button">
          <a class="btn btn-primary" href="#">Generate URL</a>
          <input class="share-url form-control" type="url" id="share_url" style="width: 150px">
        </div>

        <button class="btn btn-primary btn-compare"
          data-text-on="End Compare"
          data-text-off="Compare Selected">
          Compare Selected
        </button>
      </div>
    </div>

    <div class="pull-left form-inline">
        <strong> Filter:</strong>
        Min Memory (GB): <input data-action="datafilter"
                                data-type="memory"
                                size=4
                                class="form-control"
                                style="width: 45px" />

        Compute Units: <input data-action="datafilter"
                              data-type="computeunits"
                              size=4
                              class="form-control"
                              style="width: 45px" />

        Storage (GB): <input data-action="datafilter"
                             data-type="storage"
                             size=4
                             class="form-control"
                             style="width: 45px" />
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
          <th class="cores">Cores</th>
          <th class="ecu-per-core">ECU per Core</th>
          <th class="storage">Storage</th>
          <th class="architecture">Arch</th>
          <th class="networkperf">Network Performance</th>
          <th class="max_bandwidth">Max Bandwidth (MB/s)</th>
          <th class="ebs-throughput">EBS Optimized Throughput (Mbps)</th>
          <th class="ebs-iops">Max EBS Optimized 16K IOPS</th>
          <th class="maxips">
            <abbr title="Adding additional IPs requires launching the instance in a VPC.">Max IPs</abbr>
          </th>
          <th class="enhanced-networking">Enhanced Networking</th>
          <th class="linux-virtualization">Linux Virtualization</th>

          <th class="cost-ondemand-linux">Linux On Demand cost</th>
          <th class="cost-reserved-linux">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux Reserved cost</abbr>
          </th>
          <th class="cost-ondemand-mswin">Windows On Demand cost</th>
          <th class="cost-reserved-mswin">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows Reserved cost</abbr>
          </th>
          <th class="cost-ondemand-mswinSQLWeb">Windows SQL Web On Demand cost</th>
          <th class="cost-reserved-mswinSQLWeb">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows SQL Web Reserved cost</abbr>
          </th>
          <th class="cost-ondemand-mswinSQL">Windows SQL Std On Demand cost</th>
          <th class="cost-reserved-mswinSQL">
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
            <span sort="${inst['ECU']}">${"%g" % (inst['ECU'],)} units</span>
            % if inst.get('burstable'):
             (<a href="http://aws.amazon.com/ec2/instance-types/#burst" target="_blank">Burstable</a>)
            % endif
          </td>
          <td class="cores">
            <span sort="${inst['vCPU']}">
              ${inst['vCPU']} cores
            </span>
          </td>
          <td class="ecu-per-core">
            <span sort="${inst['ECU_per_core']}">${"%.4g" % inst['ECU_per_core']} units</span>
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
          <td class="max_bandwidth">
            % if not inst['max_bandwidth']:
            <span sort="0">N/A</span>
            % else:
            <span sort="${inst['max_bandwidth']}">
              ${inst['max_bandwidth']}
            </span>
            % endif
          </td>
          <td class="ebs-throughput">
            <span sort="${inst['ebs_throughput']}">
              ${inst['ebs_throughput']}
            </span>
          </td>
          <td class="ebs-iops">
            <span sort="${inst['ebs_iops']}">
              ${inst['ebs_iops']}
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
          <td class="linux-virtualization">
            % if inst['linux_virtualization_types']:
            ${', '.join(inst['linux_virtualization_types'])}
            % else:
            Unknown
            % endif
          </td>
    % for platform in ['linux', 'mswin', 'mswinSQLWeb', 'mswinSQL']:
          <td class="cost-ondemand cost-ondemand-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',{})).get('ondemand') for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('ondemand', 'N/A') != "N/A":
                 $${inst['pricing']['us-east-1'][platform]['ondemand']} per hour
            % else:
            unavailable
            % endif
          </td>
          <td class="cost-reserved cost-reserved-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',{})).get('reserved', {}) for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, {}).get('reserved', 'N/A') != "N/A":
                 $${inst['pricing']['us-east-1'][platform]['reserved']['yrTerm1.noUpfront']} per hour
            % else:
              unavailable
            % endif
          </td>
    % endfor
        </tr>
% endfor
      </tbody>
    </table>

    <div class="well">
      <p>This site was created out of frustration while trying to compare EC2 instances using Amazon's <a href="http://aws.amazon.com/ec2/instance-types/" target="_blank">instance type</a> and <a href="http://aws.amazon.com/ec2/pricing/" target="_blank">pricing</a> pages.</p>
      <p>It was started by <a href="http://twitter.com/powdahound" target="_blank">@powdahound</a>, contributed to by <a href="https://github.com/powdahound/ec2instances.info/contributors" target="_blank">many</a>, is <a href="http://powdahound.com/2011/03/hosting-a-static-site-on-amazon-s3-ec2instances-info" target="_blank">hosted on S3</a>, and awaits your improvements <a href="https://github.com/powdahound/ec2instances.info" target="_blank">on GitHub</a>.</p>
    </div>
    <div class="well-small">
      <p class="small">Generated at: ${generated_at}</p>
    </div>

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js" type="text/javascript" charset="utf-8"></script>
    <script src="bootstrap/js/bootstrap.min.js" type="text/javascript" charset="utf-8"></script>
    <script type="text/javascript" charset="utf8" src="https://ajax.aspnetcdn.com/ajax/jquery.dataTables/1.10.4/jquery.dataTables.min.js"></script>
    <script src="default.js" type="text/javascript" charset="utf-8"></script>

  </body>
</html>
