<!DOCTYPE html>

<html lang="en">
  <head>
    <meta charset="UTF-8">
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-TBZCV32');</script>
    <!-- End Google Tag Manager -->
      <!-- Required meta tags -->
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

    <%block name="meta"/>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Vantage",
        "alternateName": ["EC2Instances.info", "Vantage Cloud Costs"],
        "url": "https://instances.vantage.sh/"
      }
    </script>
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
      <div class="nav">
        <div class="logo-group me-md-3 me-0 align-items-center">
          <div class="d-flex align-items-center gap-2">
            <a href="/" class="logo">
              <img width="28" height="28" alt="Vantage Logo" src="/vantage-logo-icon.svg">
            </a>
            <div class="d-flex flex-column">
              <p class="fs-6 fw-semibold text-white mb-0">Instances</p>
              <a href="/" class="text-decoration-none text-white mb-0 opacity-75" style="font-size: 12px;">Presented by Vantage</a>
            </div>
          </div>
          <div class="d-flex align-items-center d-none d-md-block ms-3">
            <ul class="list-unstyled nav-tabs nav-buttons nav-position mb-0 ms-2">
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
          <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon contr-mobile">
            <img src="/icon-github.svg" height="18" width="18" class="me-1" />
            Star
          </a>
        </div>
        <div class="d-flex">
          <div class="nav-buttons px-2 d-none d-xxl-block">
            <a target="_blank" href="https://vantage.sh/slack" class="btn btn-github btn-icon">
              <img src="/icon-slack.svg" height="18" width="18" class="me-1" />
              Slack
            </a>
          </div>
          <div class="nav-buttons d-none d-xxl-block">
            <a target="_black" href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon">
              <img src="/icon-github.svg" height="18" width="18" class="me-1" />
              Star
            </a>
          </div>
        </div>
      </div>
      
      <%include file="ads-banner.mako"/>

      <div class="clearfix"></div>

      ${self.body()}

      <div class="footer well border-top">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-3">
            <div class="provider-toggle">
              <div class="toggle-option toggle-option--active">
                <img src="/icon-aws.svg" height="18" width="18" />
                AWS
              </div>
              <a href="/azure" class="toggle-option">
                <img src="/icon-azure.svg" height="18" width="18" />
                Azure
              </a>
            </div>
            <div class="d-none d-md-block">
              <span>Updated ${generated_at}</span>
            </div>
          </div>
          <div class="d-none d-md-block">
            <%block name="header"/>
          </div>
          <div class="d-flex align-items-center gap-3">
            <a href="https://handbook.vantage.sh/tools/instances/" target="_blank">Docs</a>
            <span>By <a target="_blank" href="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=by-vantage">Vantage</a></span>
            <div class="d-md-flex d-none gap-2">
              <div class="d-none d-md-block">
                <input class="form-control" id="api-email-input" placeholder="Email">
              </div>
              <div class="d-none d-md-block">
                <button class="btn btn-primary api-submit-input">Get API Key</button>
              </div>
            </div>
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
    <script src="/store/store.js" type="text/javascript" charset="UTF-8"></script>

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

    <script src="/vantage.js" type="text/javascript" charset="UTF-8"></script>
    <script src="/default.js" type="text/javascript" charset="UTF-8"></script>
  </body>
</html>
