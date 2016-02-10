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

      <span class="pull-right">
        <a href="https://twitter.com/share" class="twitter-share-button" data-via="powdahound"></a>
        <iframe src="https://ghbtns.com/github-btn.html?user=powdahound&repo=ec2instances.info&type=star&count=true" frameborder="0" scrolling="0" width="100px" height="20px"></iframe>
      </span>

      <%block name="header"/>

      <ul class="nav nav-tabs">
% if self.attr.active_ == 'ec2':
        <li role="presentation" class="active"><a href="http://ec2instances.info/">EC2</a></li>
        <li role="presentation"><a href="http://rdsinstances.info/">RDS</a></li>
% endif
% if self.attr.active_ == 'rds':
        <li role="presentation"><a href="http://ec2instances.info/">EC2</a></li>
        <li role="presentation" class="active"><a href="http://rdsinstances.info/">RDS</a></li>
% endif
        <li class="pull-right label label-info">Last Update: ${generated_at}</li>
      </ul>

    </div>

    <div class="clear-fix"></div>

    ${self.body()}

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
