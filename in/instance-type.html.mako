<!DOCTYPE html>

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <%block name="meta"/>
    <link rel="stylesheet" href="/default.css" media="screen">
    <!-- Boostrap 3.2 https://bootstrapdocs.com/v3.2.0/docs/ -->
    <link rel="stylesheet" href="/bootstrap/css/bootstrap.min.css" media="screen">
    <link rel="icon" type="image/png" href="/favicon.png">
    <title>${i["Amazon"][4]['value']} Details</title>
    <meta name="description" content="${i['Amazon'][4]['value']} CPUs, memory, storage and pricing"></head>
    <style>
      table, th, td {
        border: 1px solid black;
      }
    </style>
  </head>
    
  <body>
    <div class="navbar navbar-default">
    </div>

    <div class="row">

      <div class="col-md-8">
        <h1>${i["Amazon"][4]['value']}</h1>
        <div class="row">
          <div class="col-sm-4">
            <select id="region">
              <option value='us-east-1'>US East (N. Virginia)</option>
              <option value='af-south-1'>Africa (Cape Town)</option>
              <option value='ap-east-1'>Asia-Pacific (Hong Kong)</option>
              <option value='ap-south-1'>Asia-Pacific (Mumbai)</option>
              <option value='ap-northeast-3'>Asia Pacific (Osaka-Local)</option>
              <option value='ap-northeast-2'>Asia-Pacific (Seoul)</option>
              <option value='ap-southeast-1'>Asia-Pacific (Singapore)</option>
              <option value='ap-southeast-2'>Asia-Pacific (Sydney)</option>
              <option value='ap-southeast-3'>Asia-Pacific (Jakarta)</option>
              <option value='ap-northeast-1'>Asia-Pacific (Tokyo)</option>
              <option value='ca-central-1'>Canada (Central)</option>
              <option value='eu-central-1'>Europe (Frankfurt)</option>
              <option value='eu-west-1'>Europe (Ireland)</option>
              <option value='eu-west-2'>Europe (London)</option>
              <option value='eu-west-3'>Europe (Paris)</option>
              <option value='eu-north-1'>Europe (Stockholm)</option>
              <option value='eu-south-1'>Europe (Milan)</option>
              <option value='me-south-1'>Middle East (Bahrain)</option>
              <option value='sa-east-1'>South America (S&atilde;o Paulo)</option>
              <option value='us-east-2'>US East (Ohio)</option>
              <option value='us-west-1'>US West (Northern California)</option>
              <option value='us-west-2'>US West (Oregon)</option>
              <option value='us-gov-west-1'>AWS GovCloud (US-West)</option>
              <option value='us-gov-east-1'>AWS GovCloud (US-East)</option>
            </select>
          </div>
          <div class="col-sm-4">
            <select id="os">
              <option value="linux">Linux</option>
              <option value="mswin">Windows</option>
              <option value="rhel">Red Hat</option>
              <option value="sles">SUSE</option>
              <option value="linuxSQL">Linux SQL Server</option>
              <option value="linuxSQLEnterprise">Linux SQL Server for Enterprise</option>
              <option value="linuxSQLWeb">Linux SQL Server for Web</option>
              <option value="mswinSQL">Windows SQL Server</option>
              <option value="mswinSQLEnterprise">Windows SQL Server for Enterprise</option>
              <option value="mswinSQLWeb">Windows SQL Server for Web</option>
              <option value="rhelSQL">Red Hat SQL Server</option>
              <option value="rhelSQLEnterprise">Red Hat SQL Server Enterprise</option>
              <option value="rhelSQLWeb">Red Hat SQL Server for Web</option>

            </select>
          </div>
          <div class="col-sm-4">
            <select id="unit">
              <option value="hour">Per Hour</option>
              <option value="second">Per Second</option>
              <option value="day">Per Day</option>
              <option value="week">Per Week</option>
              <option value="month">Per Month</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="col-sm-3">
            <p>${i["Pricing"]["us-east-1"]["linux"]["ondemand"]}</p>
            <p>On Demand</p>
          </div>
          <div class="col-sm-3">
            <p>${i["Pricing"]["us-east-1"]["linux"]["_1yr"]}</p>
            <p>1 Year Reserved</p>
          </div>
          <div class="col-sm-3">
            <p>${i["Pricing"]["us-east-1"]["linux"]["spot"]}</p>
            <p>Spot</p>
          </div>
          <div class="col-sm-3">
            <p>${i["Pricing"]["us-east-1"]["linux"]["_3yr"]}</p>
            <p>3 Year Reserved</p>
          </div>
        </div>
        <div class="row">
          </div>
            % for category, attrs in i.items():
              <h2>${category}</h2>
                % if category == "Coming Soon":
                  % for a in attrs:
                    <p>${a["display_name"]}</p>
                  % endfor
                % elif category == "Not Shown":
                  <p>Request this data to be included on Github</p>
                  % for a in attrs:
                    <p>${a["cloud_key"]}</p>
                  % endfor
                % elif category == "Pricing":
                  <p>See the main page for full pricing</p>
                % else:
                  <table>
                    <tr>
                      <th>${category}</th>
                      <th></th>
                    </tr>
                  % for a in attrs:
                    <tr>
                      <td>${a["display_name"]}</td>
                      <td>${a["value"]}</td>
                    </tr>
                  % endfor
                  </table>
                % endif
            % endfor
          </div>

          <div class="col-md-4">
            <div class="row">
              <h2>News</h2>
              <p>Instance Annoucement</p>
            </div>
            <div class="row">
              <h2>Comments</h2>
              <p>This instance rules</p>
            </div>
          </div>

        </div>
      </div>
    </div>


  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js" type="text/javascript" charset="utf-8"></script>
  <script src="/bootstrap/js/bootstrap.min.js" type="text/javascript" charset="utf-8"></script>
  <script type="text/javascript">
    var _prices = ${i["Pricing"]};

    $('#region').change(function() {
      console.log($(this).val());
      // recalulate_redisplay_prices()
    });
    $('#os').change(function() {
      console.log($(this).val());
      // recalulate_redisplay_prices()
    });
    $('#unit').change(function() {
      console.log($(this).val());
      // recalulate_redisplay_prices()
    });



  </script>
  </body>
</html>