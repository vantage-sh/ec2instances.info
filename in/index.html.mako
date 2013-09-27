<!DOCTYPE html>

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Amazon EC2 Instance Comparison</title>
    <link rel="stylesheet" href="default.css" media="screen">
    <link rel="stylesheet" href="bootstrap/css/bootstrap.min.css" media="screen">
  </head>

  <body>
    <div class="page-header">
      <h1>EC2Instances.info <small>Easy Amazon EC2 Instance Comparison</small></h1>
    </div>

    <div class="pull-left">
      <div class="btn-group">
        <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
          <i class="icon-globe icon-white"></i> Region: US East
          <span class="caret"></span>
        </a>
        <ul class="dropdown-menu" role="menu">
          <li><a href="javascript:;">US East</a></li>
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
          <li><a href="javascript:;" duration="yearly">Yearly</a></li>
        </ul>
      </div>

      <div class="btn-group" id="filter-dropdown">
        <a class="btn dropdown-toggle btn-primary" data-toggle="dropdown" href="#">
          <i class="icon-filter icon-white"></i>
          <span class="caret"></span>
        </a>
        <ul class="dropdown-menu" role="menu">
          <!-- table header elements inserted by js -->
        </ul>
      </div>
    </div>

    <table cellspacing="0" class="table table-bordered table-hover table-condensed" id="data">
      <thead>
        <tr>
          <th class="name">Name</th>
          <th class="memory">Memory</th>
          <th class="computeunits">
            <abbr title="One EC2 Compute Unit provides the equivalent CPU capacity of a 1.0-1.2 GHz 2007 Opteron or 2007 Xeon processor.">Compute Units</abbr>
          </th>
          <th class="storage">Storage</th>
          <th class="architecture">Architecture</th>
          <th class="ioperf">I/O Performance</th>
          <th class="maxips">
            <abbr title="Adding additional IPs requires launching the instance in a VPC.">Max IPs</abbr>
          </th>
          <th class="apiname">API Name</th>
          <th class="cost">Linux cost</th>
          <th class="cost">Windows cost</th>
        </tr>
      </thead>
      <tbody>
% for inst in instances:
        <tr>
          <td class="name">${inst['pretty_name']}</td>
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GB</span></td>
          <td class="computeunits">
            % if inst['instance_type'] == 't1.micro':
            <span sort="2">2 (only for short bursts)</span>
            % else:
            <span sort="${inst['ECU']}">${"%g" % (inst['ECU'],)}
              % if 'cpu_details' in inst:
                (${inst['cpu_details']['cpus']} x
                 <abbr title='${inst['cpu_details']['note']}'>
                   ${inst['cpu_details']['type']}
                 </abbr>
                 )
              % else:
              (${inst['vCPU']} core x ${"%g" % (inst['ECU']/inst['vCPU'],)} unit)
              % endif
            </span>
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
          <td class="ioperf">
            <span sort="${inst['network_sort']}">
              ${inst['network_performance']}
              % if inst['ebs_optimized']:
               / <abbr title="EBS-Optimized available">${500 if inst['network_performance'] == 'Moderate' else 1000} Mbps</abbr>
              % endif
            </span>
          </td>
          <td class="maxips">${inst['vpc']['max_enis'] * inst['vpc']['ips_per_eni']}</td>
          <td class="apiname">${inst['instance_type']}</td>
          <% pricing = inst['pricing']['us-east-1'] %>
          <td class="cost" hour_cost="${pricing['linux']}">\$${pricing['linux']} per hour</td>
          <td class="cost" hour_cost="${pricing['mswin']}">\$${pricing['mswin']} per hour</td>
        </tr>
% endfor
      </tbody>
    </table>

    <div class="well">
      <p>This site was created out of frustration while trying to compare EC2 instances using Amazon's <a href="http://aws.amazon.com/ec2/instance-types/" target="_blank">instance type</a> and <a href="http://aws.amazon.com/ec2/pricing/" target="_blank">pricing</a> pages.</p>
      <p>It was started by <a href="http://twitter.com/powdahound" target="_blank">@powdahound</a>, contributed to by <a href="https://github.com/powdahound/ec2instances.info/contributors" target="_blank">many</a>, is <a href="http://powdahound.com/2011/03/hosting-a-static-site-on-amazon-s3-ec2instances-info" target="_blank">hosted on S3</a>, and awaits your improvements <a href="https://github.com/powdahound/ec2instances.info" target="_blank">on GitHub</a>.</p>
    </div>

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js" type="text/javascript" charset="utf-8"></script>
    <script src="bootstrap/js/bootstrap.min.js" type="text/javascript" charset="utf-8"></script>
    <script type="text/javascript" charset="utf8" src="http://ajax.aspnetcdn.com/ajax/jquery.dataTables/1.9.4/jquery.dataTables.min.js"></script>
    <script src="default.js" type="text/javascript" charset="utf-8"></script>

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
  </body>
</html>
