<!DOCTYPE html>

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <%block name="meta"/>
    <link rel="stylesheet" href="/default.css" media="screen">
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
    <h1>${i["Amazon"][4]['value']}</h1>

    <div>
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
  </body>
</html>