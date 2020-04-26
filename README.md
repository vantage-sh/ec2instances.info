# ec2instances.info

I was sick of comparing EC2 instance metrics and pricing on Amazon's site so I made [ec2instances.info](https://ec2instances.info). Improvements welcome!


### Project status

[![Build Status](https://travis-ci.org/powdahound/ec2instances.info.svg)](https://travis-ci.org/powdahound/ec2instances.info)

I'm actively maintaining the site with the help of contributors here, but am not working on large new features.

People have suggested many neat ideas and feature requests but it remains unclear how long the site will be necessary. I've heard from teams at Amazon that they use the site internally and some have mentioned that they might be building something similar. They certainly have access to better data.


### Running locally

Make sure you have LibXML and Python development files.  On Ubuntu, run `sudo apt-get install python-dev libxml2-dev libxslt1-dev libssl-dev`.

First, you'll need to provide credentials so that boto can access the AWS API. Options for setting this up are described in the [boto docs](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/configuration.html). Ensure that your IAM user has at least the following permissions:

    ```
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "ec2:DescribeInstanceTypes",
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": "pricing:*",
                "Resource": "*"
            }
        ]
    }
    ```

Then:

1. Clone the git repo
2. `cd ec2instances.info/`
3. `python3 -m venv env`
4. `source env/bin/activate`
5. `pip install -r requirements.txt`
6. `invoke build`
7. `invoke serve`
8. Browse to http://localhost:8080
9. `deactivate` (to exit virtualenv)


### Requirements

- Python with virtualenv
- [Invoke](http://www.pyinvoke.org/)
- [Boto](http://boto.readthedocs.org/en/latest/)
- [Mako](http://www.makotemplates.org/)
- [lxml](http://lxml.de/)

### Docker

To build a docker image follow these steps:

1. Clone the git repo
2. `cd ec2instances.info`
3. `docker build -t ec2instances.info .`
4. Start a container `docker run -d --name some-container -p 8080:8080 ec2instances.info`
5. Update files `docker exec -it some-container bash -c "invoke build"`

Also this image can be found at quay.io/ssro/ec2instances.info

To use this instead of building your own:

`docker run -d --name some-container -p 8080:8080 quay.io/ssro/ec2instances.info`

Update files as described at step 5.
