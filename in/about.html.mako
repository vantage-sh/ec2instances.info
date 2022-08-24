<%!
  active_ = ""
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>About ec2instance.info AWS Comparison Site</title>
        <meta name="description" content="A free and easy-to-use tool for comparing ElastiCache Instance features and prices."></head>
    </%block>

    <div class="mx-2 my-2">
      <div class="row">
      <div class="col-6">
        <h4>Why?</h4>
        <p>
          Because it's frustrating to compare instances using Amazon's own <a href="http://aws.amazon.com/ec2/instance-types/" target="_blank">instance type</a>, <a href="http://aws.amazon.com/ec2/pricing/" target="_blank">pricing</a>, and other pages.
        </p>
        <h4>Who?</h4>
        <p>
          It was started by <a href="http://twitter.com/powdahound" target="_blank">@powdahound</a>, contributed to by <a href="https://github.com/vantage-sh/ec2instances.info/contributors" target="_blank">many</a>, 
          is now managed and maintained by <a href='http://vantage.sh/' target="_blank">Vantage</a>, and awaits your improvements <a href="https://github.com/vantage-sh/ec2instances.info" target="_blank">on GitHub</a>.  
          In the development of Detail Pages, we used designs from <a href="https://cloudhw.info/">cloudhw.info</a> with permission from <a href="https://powersj.io/">Joshua Powers</a>.
        </p>
        <h4 class="bg-warning">Warning</h4>
        <p>
          This site is not maintained by or affiliated with Amazon. The data shown is not guaranteed to be accurate or current. Please <a href="http://github.com/powdahound/ec2instances.info/issues">report issues</a> you see.
        </p>
      </div>
      <div class="col-6">
      <h4>Changelog</h4>
      <ul>
        <li><a href="https://www.vantage.sh/blog/ec2instances-launches-detail-pages">Detail Pages</a></li>
        <li><a href="https://github.com/vantage-sh/ec2instances.info/pull/628">ElastiCache</a></li>
        <li><a href="https://www.vantage.sh/blog/vantage-has-acquired-ec2instances-info">Vantage acquires EC2Instances.info</a></li>
        <li><a href="https://github.com/vantage-sh/ec2instances.info/pull/544">Availability Zones</a></li>
        <li><a href="https://github.com/vantage-sh/ec2instances.info/pull/466">FPGAs</a></li>
        <li><a href="https://github.com/vantage-sh/ec2instances.info/pull/362">NVME storage</a></li>
        <li>and much more since 2011</li>
      </ul>
      </div>
      </div>

    </div>