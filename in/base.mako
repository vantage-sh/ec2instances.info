<!DOCTYPE html>

<html lang="en">
  <head>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-TBZCV32');</script>
    <!-- End Google Tag Manager -->
      <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <%block name="meta"/>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="icon" type="image/png" href="https://assets.vantage.sh/www/favicon-32x32.png">
    <!-- Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/bs5/jq-3.6.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/r-2.4.1/datatables.min.css"/>
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/default.css" media="screen">
    <link rel="stylesheet" href="/style.css">
  </head>

  <body class="ec2instances">
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TBZCV32"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <div class="d-flex flex-column w-100 h-100">
      <div class="nav py-0">
        <div class="logo-group me-md-3 me-0 align-items-center">
          <a href="/" class="logo">
            <img width="135" height="100%" src="/vantage-logo-horizontal.svg">
          </a>
          <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon contr-mobile">
            <svg class="me-1" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" fill="#1a1a1c" d="M9 0C4.0275 0 0 4.0275 0 9C0 12.9825 2.57625 16.3463 6.15375 17.5387C6.60375 17.6175 6.7725 17.3475 6.7725 17.1112C6.7725 16.8975 6.76125 16.1888 6.76125 15.435C4.5 15.8513 3.915 14.8837 3.735 14.3775C3.63375 14.1187 3.195 13.32 2.8125 13.1062C2.4975 12.9375 2.0475 12.5212 2.80125 12.51C3.51 12.4987 4.01625 13.1625 4.185 13.4325C4.995 14.7937 6.28875 14.4113 6.80625 14.175C6.885 13.59 7.12125 13.1962 7.38 12.9712C5.3775 12.7463 3.285 11.97 3.285 8.5275C3.285 7.54875 3.63375 6.73875 4.2075 6.10875C4.1175 5.88375 3.8025 4.96125 4.2975 3.72375C4.2975 3.72375 5.05125 3.4875 6.7725 4.64625C7.4925 4.44375 8.2575 4.3425 9.0225 4.3425C9.7875 4.3425 10.5525 4.44375 11.2725 4.64625C12.9938 3.47625 13.7475 3.72375 13.7475 3.72375C14.2425 4.96125 13.9275 5.88375 13.8375 6.10875C14.4113 6.73875 14.76 7.5375 14.76 8.5275C14.76 11.9812 12.6562 12.7463 10.6538 12.9712C10.98 13.2525 11.2613 13.7925 11.2613 14.6363C11.2613 15.84 11.25 16.8075 11.25 17.1112C11.25 17.3475 11.4187 17.6287 11.8688 17.5387C15.4237 16.3463 18 12.9712 18 9C18 4.0275 13.9725 0 9 0Z" fill="white"/>
            </svg>
            Star
          </a>
          <div class="d-flex align-items-center d-none d-md-block">
            <ul class="list-unstyled nav-tabs nav-buttons nav-position mb-0 ms-2" style="padding-top: 14px;">
              <li role="presentation" class="${'active' if self.attr.active_ == 'ec2' else ''}">
                <a class="d-flex align-items-center" href="/">
                  EC2
                </a>
              </li>
              <li role="presentation" class="${'active' if self.attr.active_ == 'rds' else ''}">
                <a class="d-flex align-items-center" href="/rds/">
                  RDS
                </a>
              </li>
              <li role="presentation" class="${'active' if self.attr.active_ == 'cache' else ''}">
                <a class="d-flex align-items-center" href="/cache/">
                  ElastiCache
                </a>
              </li>
              <li role="presentation" class="${'active' if self.attr.active_ == 'redshift' else ''}">
                <a class="d-flex align-items-center" href="/redshift/">
                  Redshift
                </a>
              </li>
              <li role="presentation" class="${'active' if self.attr.active_ == 'opensearch' else ''}">
                <a class="d-flex align-items-center" href="/opensearch/">
                  OpenSearch 
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="d-flex align-items-center d-none d-xl-block">
          <img width="24" height="24" src="/kubernetes-icon.svg">
          <a href="https://console.vantage.sh/signup" class="vantage">Rightsize <span class="fw-semibold">Kubernetes</span> clusters with Pod Efficiency Metrics -></a>
        </div>
        <div class="d-flex">
          <div class="nav-buttons px-2 d-none d-xxl-block">
            <a target="_blank" href="https://join.slack.com/t/vantagecommunity/shared_invite/zt-1szz6puz7-zRuJ8J4OJIiBFlcTobYZXA" class="btn btn-purple btn-icon">
              <img class="me-1" width="18px" height="18px" src="https://cdn.bfldr.com/5H442O3W/at/pl546j-7le8zk-j7mis/Slack_Mark_Monochrome_White.svg?auto=webp&format=png&width=100&height=100"> 
              Slack
            </a>
          </div>
          <div class="nav-buttons d-none d-xxl-block">
            <a target="_black" href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon">
              <svg class="me-1" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" fill="#1a1a1c" d="M9 0C4.0275 0 0 4.0275 0 9C0 12.9825 2.57625 16.3463 6.15375 17.5387C6.60375 17.6175 6.7725 17.3475 6.7725 17.1112C6.7725 16.8975 6.76125 16.1888 6.76125 15.435C4.5 15.8513 3.915 14.8837 3.735 14.3775C3.63375 14.1187 3.195 13.32 2.8125 13.1062C2.4975 12.9375 2.0475 12.5212 2.80125 12.51C3.51 12.4987 4.01625 13.1625 4.185 13.4325C4.995 14.7937 6.28875 14.4113 6.80625 14.175C6.885 13.59 7.12125 13.1962 7.38 12.9712C5.3775 12.7463 3.285 11.97 3.285 8.5275C3.285 7.54875 3.63375 6.73875 4.2075 6.10875C4.1175 5.88375 3.8025 4.96125 4.2975 3.72375C4.2975 3.72375 5.05125 3.4875 6.7725 4.64625C7.4925 4.44375 8.2575 4.3425 9.0225 4.3425C9.7875 4.3425 10.5525 4.44375 11.2725 4.64625C12.9938 3.47625 13.7475 3.72375 13.7475 3.72375C14.2425 4.96125 13.9275 5.88375 13.8375 6.10875C14.4113 6.73875 14.76 7.5375 14.76 8.5275C14.76 11.9812 12.6562 12.7463 10.6538 12.9712C10.98 13.2525 11.2613 13.7925 11.2613 14.6363C11.2613 15.84 11.25 16.8075 11.25 17.1112C11.25 17.3475 11.4187 17.6287 11.8688 17.5387C15.4237 16.3463 18 12.9712 18 9C18 4.0275 13.9725 0 9 0Z" fill="white"/>
              </svg>
              Star
            </a>
          </div>
        </div>
      </div>

      <div class="clearfix"></div>

      ${self.body()}

      <div class="footer well border-top">
          <div class="row ms-2 me-2 mt-2">
            <div class="col-8 col-md-3">
              <span>Updated ${generated_at}</span>
            </div>
            <div class="col-6 d-none d-md-block right linkto align-items-start mt-0">
              <div class="row align-items-start mt-0">
                <div class="col-9 d-none d-xl-block">
                  <%block name="header"/>
                </div>
                <div class="col-2">
                  <a href="https://handbook.vantage.sh/tools/instances/" target="_blank">Docs</a>
                </div>
                <div class="col-1">
                  <a href="https://instances.vantage.sh/about">About</a>
                </div>
              </div>
            </div>
            <div class="col-4 col-md-3 right linkto pull-right">
              <span><a target="_blank" href="https://vantage.sh/events/reinvent-2023-vantage">re:Invent 2023</a></span>
            </div>
          </div>
      </div>

    </div>

    <!-- Libraries: Bootstrap 5.2 (5.1 has an issue where a black bar appears under the table header on load)
                    jQuery 3.6
                    Datatables 1.12 (Buttons 2.2, Colvis 2.2, Datatables with Bootstrap)
         Configure options and upgrade here: https://datatables.net/download/
    -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/v/bs5/jq-3.6.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/r-2.4.1/datatables.min.js"></script>
    <script src="/store/store.js" type="text/javascript" charset="utf-8"></script>

    <!-- Custom JS -->
    <script type="text/javascript">
        % if pricing_json:
          var _pricing = ${pricing_json};
          function get_pricing() {
              // see compress_pricing in render.py for the generation side
              v = _pricing["data"];
              for (var i = 0; i < arguments.length; i++) {
                  if (arguments[i] === "none") {
                    // this is for services like Redshift and OpenSearch which 
                    // do not have multiple 'platforms'. RDS for example has 20 
                    // OS's, and ElastiCache has Memcached and Redis
                    continue;
                  }
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
        % endif
    </script>

    <script src="/vantage.js" type="text/javascript" charset="utf-8"></script>
    <script src="/default.js" type="text/javascript" charset="utf-8"></script>
  </body>
</html>
