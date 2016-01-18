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
  </head>

  <body class="ec2instances">
    <div class="page-header">
      <h1>EC2Instances.info <small>Easy Amazon EC2 Instance Comparison</small></h1>

      <a href="https://twitter.com/share" class="twitter-share-button" data-via="powdahound"></a>

      <iframe src="https://ghbtns.com/github-btn.html?user=powdahound&repo=ec2instances.info&type=star&count=true" frameborder="0" scrolling="0" width="100px" height="20px"></iframe>
    </div>

    <!--
    <div class="alert">
      <button type="button" class="close" data-dismiss="alert">&times;</button>
      <strong>Warning!</strong> Some information on this page is outdated. Please see <a href="https://github.com/powdahound/ec2instances.info/issues/75">this issue</a> for more detail.
    </div>
    -->

    <div class="row" id="menu">
      <div class="col-sm-12">
        <div class="btn-group" id='region-dropdown'>
          <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
            <i class="icon-globe icon-white"></i>
            Region: <span class="text"></span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a href="javascript:;" data-region='ap-northeast-2'>Asia-Pacific (Seoul)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-1'>Asia-Pacific (Singapore)</a></li>
            <li><a href="javascript:;" data-region='ap-southeast-2'>Asia-Pacific (Sydney)</a></li>
            <li><a href="javascript:;" data-region='ap-northeast-1'>Asia-Pacific (Tokyo)</a></li>
            <li><a href="javascript:;" data-region='eu-central-1'>EU (Frankfurt)</a></li>
            <li><a href="javascript:;" data-region='eu-west-1'>EU (Ireland)</a></li>
            <li><a href="javascript:;" data-region='sa-east-1'>South America (Sao Paolo)</a></li>
            <li><a href="javascript:;" data-region='us-east-1'>US East</a></li>
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

        <button class="btn btn-primary btn-compare"
          data-text-on="End Compare"
          data-text-off="Compare Selected">
          Compare Selected
        </button>
      </div>
    </div>

    <div class="pull-left form-inline" id="filters">
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
          <th class="cores">Cores</th>
          <th class="ecu-per-core">ECU per Core</th>
          <th class="storage">Storage</th>
          <th class="architecture">Arch</th>
          <th class="networkperf">Network Performance</th>
          <th class="ebs-throughput">EBS Optimized: Throughput</th>
          <th class="ebs-iops">EBS Optimized: Max 16K IOPS</th>
          <th class="ebs-max-bandwidth">EBS Optimized: Max Bandwidth</th>
          <th class="maxips">
            <abbr title="Adding additional IPs requires launching the instance in a VPC.">Max IPs</abbr>
          </th>
          <th class="enhanced-networking">Enhanced Networking</th>
          <th class="vpc-only">VPC Only</th>
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
            % if inst['ECU'] == 'variable':
            <span sort="0"><a href="http://aws.amazon.com/ec2/instance-types/#burst" target="_blank">Burstable</a></span>
            % else:
            <span sort="${inst['ECU']}">${"%g" % (inst['ECU'],)} units</span>
            % endif
          </td>
          <td class="cores">
            <span sort="${inst['vCPU']}">
              ${inst['vCPU']} cores
            </span>
          </td>
          <td class="ecu-per-core">
            % if inst['ECU'] == 'variable':
            <span sort="0"><a href="http://aws.amazon.com/ec2/instance-types/#burst" target="_blank">Burstable</a></span>
            % else:
            <span sort="${inst['ECU_per_core']}">${"%.4g" % inst['ECU_per_core']} units</span>
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
          <td class="ebs-throughput">
            <span sort="${inst['ebs_throughput']}">
              ${inst['ebs_throughput']} Mb/s <!-- Not MB/s! -->
            </span>
          </td>
          <td class="ebs-iops">
            <span sort="${inst['ebs_iops']}">
              ${inst['ebs_iops']} IOPS
            </span>
          </td>
          <td class="ebs-max-bandwidth">
            % if not inst['ebs_max_bandwidth']:
            <span sort="0">N/A</span>
            % else:
            <span sort="${inst['ebs_max_bandwidth']}">
              ${inst['ebs_max_bandwidth']} MB/s
            </span>
            % endif
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
      <p>
        <strong>Why?</strong>
        Because it's frustrating to compare instances using Amazon's own <a href="http://aws.amazon.com/ec2/instance-types/" target="_blank">instance type</a>, <a href="http://aws.amazon.com/ec2/pricing/" target="_blank">pricing</a>, and other pages.
      </p>
      <p>
        <strong>Who?</strong>
        It was started by <a href="http://twitter.com/powdahound" target="_blank">@powdahound</a>, contributed to by <a href="https://github.com/powdahound/ec2instances.info/contributors" target="_blank">many</a>, and awaits your improvements <a href="https://github.com/powdahound/ec2instances.info" target="_blank">on GitHub</a>.
      </p>
      <p>
        <strong>How?</strong>
        Data is scraped from multiple pages on the AWS site. This was last done at ${generated_at}.
      </p>

      <p class="bg-warning">
        <strong>Warning:</strong> This site is not maintained by or affiliated with Amazon. The data shown is not guaranteed to be accurate or current. Please <a href="http://github.com/powdahound/ec2instances.info/issues">report issues</a> you see.
      </p>

    </div>

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js" type="text/javascript" charset="utf-8"></script>
    <script src="bootstrap/js/bootstrap.min.js" type="text/javascript" charset="utf-8"></script>
    <script type="text/javascript" charset="utf8" src="https://ajax.aspnetcdn.com/ajax/jquery.dataTables/1.10.4/jquery.dataTables.min.js"></script>
    <script src="default.js" type="text/javascript" charset="utf-8"></script>

    <script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>

    <script type="text/javascript">
    var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
    document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
    </script>
    <script type="text/javascript">
    try {
      var pageTracker = _gat._getTracker("UA-4372467-3");
      pageTracker._trackPageview();
    } catch(err) {}
    </script>
  </body>
</html>
