<%!
   import json
%>
<!DOCTYPE html>

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Amazon RDS Instance Comparison</title>
    <link rel="stylesheet" href="default.css" media="screen">
    <link rel="stylesheet" href="bootstrap/css/bootstrap.min.css" media="screen">
    <link rel="icon" type="image/png" href="favicon.png">
  </head>

  <body class="ec2instances">
    <div class="page-header">
      <h1>RDSInstances.info <small>Easy Amazon RDS Instance Comparison</small></h1>

      <a href="https://twitter.com/share" class="twitter-share-button" data-via="powdahound"></a>

      <iframe src="https://ghbtns.com/github-btn.html?user=powdahound&repo=ec2instances.info&type=star&count=true" frameborder="0" scrolling="0" width="100px" height="20px"></iframe>
    </div>

    <div class="row" id="menu">
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
    </div>

    <table cellspacing="0" class="table table-bordered table-hover table-condensed" id="data">
      <thead>
        <tr>
          <th class="name">Name</th>
          <th class="apiname">API Name</th>
          <th class="memory">Memory</th>
          <th class="cores">Cores</th>
          <th class="arch">Arch</th>
          % for platform in ['Amazon Aurora', 'MariaDB', 'MySQL', 'Oracle','PostgreSQL', 'SQL Server']:
          <th class="cost-ondemand-${platform}">${platform} On Demand cost</th>
          <th class="cost-reserved-${platform}">
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
          <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GB</span></td>
          <td class="cores">
            <span sort="${inst['vcpu']}">
              ${inst['vcpu']} cores
            </span>
          </td>
          <td class="architecture">
            % if 'i386' in inst['arch']:
            32/64-bit
            % else:
            64-bit
            % endif
          </td>
          % for platform in ['Amazon Aurora', 'MariaDB', 'MySQL', 'Oracle','PostgreSQL', 'SQL Server']:
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
