<!DOCTYPE html>

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <%block name="meta"/>
    ## <link rel="stylesheet" href="/bootstrap/css/bootstrap.min.css" media="screen">
    <link rel="stylesheet" href="/default.css" media="screen">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/js/bootstrap.bundle.min.js" integrity="sha384-pprn3073KE6tl6bjs2QrFaJGz5/SUsLqktiwsUTF55Jfv3qYSDhgCecCxMW52nD2" crossorigin="anonymous"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.12.1/css/dataTables.bootstrap5.css"/>
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.3/css/buttons.bootstrap5.css"/>

  </head>

  <body class="ec2instances">
    <div class="page-header">
      <!--
      <span class="pull-right">
        <iframe src="https://ghbtns.com/github-btn.html?user=vantage-sh&repo=ec2instances.info&type=star&count=true" frameborder="0" scrolling="0" width="100px" height="20px"></iframe>
      </span>
      -->

      <ul class="nav nav-tabs">
        <li role="presentation" class="${'active' if self.attr.active_ == 'ec2' else ''}"><a href="/">EC2</a></li>
        <li role="presentation" class="${'active' if self.attr.active_ == 'rds' else ''}"><a href="/rds/">RDS</a></li>
        <li role="presentation" class="${'active' if self.attr.active_ == 'cache' else ''}"><a href="/cache/">ElastiCache</a></li>
      </ul>
    </div>

    <div class="clearfix"></div>

    ${self.body()}

    <div class="well">
      <p>
        <strong>Why?</strong>
        Because it's frustrating to compare instances using Amazon's own <a href="http://aws.amazon.com/ec2/instance-types/" target="_blank">instance type</a>, <a href="http://aws.amazon.com/ec2/pricing/" target="_blank">pricing</a>, and other pages.
      </p>
      <p>
        <strong>Who?</strong>
        It was started by <a href="http://twitter.com/powdahound" target="_blank">@powdahound</a>, contributed to by <a href="https://github.com/vantage-sh/ec2instances.info/contributors" target="_blank">many</a>, is now managed and maintained by <a href='http://vantage.sh/' target="_blank">Vantage</a>, and awaits your improvements <a href="https://github.com/vantage-sh/ec2instances.info" target="_blank">on GitHub</a>.
      </p>
      <p>
        <strong>How?</strong>
        Data is scraped from multiple pages on the AWS site. This was last done at ${generated_at}.
      </p>

      <p class="bg-warning">
        <strong>Warning:</strong> This site is not maintained by or affiliated with Amazon. The data shown is not guaranteed to be accurate or current. Please <a href="http://github.com/powdahound/ec2instances.info/issues">report issues</a> you see.
      </p>

    </div>

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js" type="text/javascript" charset="utf-8"></script>
    ## <script src="/bootstrap/js/bootstrap.min.js" type="text/javascript" charset="utf-8"></script>
    ## <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    ## <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/buttons/1.2.4/js/dataTables.buttons.min.js"></script>
    ## <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/buttons/1.2.4/js/buttons.flash.min.js"></script>
    ## <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/buttons/1.2.4/js/buttons.html5.min.js"></script>
    ## <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/buttons/1.2.4/js/buttons.print.min.js"></script>

<script type="text/javascript" src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.js"></script>
<script type="text/javascript" src="https://cdn.datatables.net/1.12.1/js/dataTables.bootstrap5.js"></script>
<script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.3/js/dataTables.buttons.js"></script>
<script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.3/js/buttons.bootstrap5.js"></script>
<script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.3/js/buttons.colVis.js"></script>
    <script src="/store/store.js" type="text/javascript" charset="utf-8"></script>
    <script type="text/javascript">
        var _pricing = ${pricing_json};
        function get_pricing() {
            // see compress_pricing in render.py for the generation side
            v = _pricing["data"];
            for (var i = 0; i < arguments.length; i++) {
                k = _pricing["index"][arguments[i]];
                v = v[k];
                if (v === undefined) {
                    return undefined;
                }
            }
            return v;
        }
        var _instance_azs = ${instance_azs_json};
        function get_instance_availability_zones(instance_type, region) {
          var region_azs = _instance_azs[instance_type];
          if (region_azs) {
            var azs = region_azs[region];
            if (azs) {
              return azs;
            }
          }
          return [];
        }
    </script>
    <script src="/default.js" type="text/javascript" charset="utf-8"></script>
  </body>
</html>
