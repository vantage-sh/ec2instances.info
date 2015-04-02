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

    <div class="pull-left" id="filters">
      <div class="btn-group" id='region-dropdown'>
        <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
          <i class="icon-globe icon-white"></i>
          Region: <span class="text">Region: US East</span>
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
          <span class="text"></span>
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
        <input class="share-url" type="url" id="share_url">
      </div>

    </div>

    <table cellspacing="0" class="table table-bordered table-hover table-condensed" id="data">
      <thead>
        <tr>
          <th class="family">Family</th>
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
          <th class="ioperf">Networking Performance</th>
          <th class="ebs_throughput"><abbr title="Dedicated EBS throughput when launched as an EBS-optimized instance">EBS Throughput</abbr></th>
          <th class="maxips">
            <abbr title="Adding additional IPs requires launching the instance in a VPC.">Max IPs</abbr>
          </th>
          <th class="enhanced-networking">Enhanced Networking</th>
          <th class="linux-virtualization">Linux Virtualization</th>
          <th class="cost">Linux cost</th>
          <th class="cost-mswin">Windows cost</th>
          <th class="cost-mswinSQLWeb">Windows SQL Web cost</th>
          <th class="cost-mswinSQL">Windows SQL Std cost</th>
        </tr>
      </thead>
      <tbody>
% for inst in instances:
        <tr class='instance' id="${inst['instance_type']}">
          <td class="family">${inst['family']}</td>
          <td class="name">${inst['pretty_name']}</td>
          <td class="apiname"><span sort="${inst['instance_type_sort']}">${inst['instance_type']}</span></td>
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
          <td class="ioperf">
            <span sort="${inst['network_sort']}">
              ${inst['network_performance']}
            </span>
          </td>
          <td class="ebs_throughput"><span sort="${str(inst['ebs_throughput']).zfill(4)}">${"{} Mbps".format(inst['ebs_throughput']) if inst['ebs_throughput'] else 'N/A'}</span></td>
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
          <td class="cost cost-${platform}" data-pricing='${json.dumps({r:p.get(platform, p.get('os',0)) for r,p in inst['pricing'].iteritems()}) | h}'>
            % if inst['pricing'].get('us-east-1', {}).get(platform, 'N/A') != "N/A":
                 $${inst['pricing']['us-east-1'][platform]} per hour
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
