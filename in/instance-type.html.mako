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
          <div class="col-sm-3">
            <p>On Demand</p>
          </div>
          <div class="col-sm-3">
            <p>1 Year Reserved</p>
          </div>
          <div class="col-sm-3">
            <p>3 Year Reserved</p>
          </div>
          <div class="col-sm-3">
            <p>Spot</p>
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
  </body>
</html>