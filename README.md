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

```bash
git clone https://github.com/powdahound/ec2instances.info
cd ec2instances.info/
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
invoke build
invoke serve
open http://localhost:8080
deactivate # to exit virtualenv
```

### Requirements

- Python with virtualenv
- [Invoke](http://www.pyinvoke.org/)
- [Boto](http://boto.readthedocs.org/en/latest/)
- [Mako](http://www.makotemplates.org/)
- [lxml](http://lxml.de/)

### Docker

To build a docker image follow these steps:

1. ```bash
   git clone https://github.com/powdahound/ec2instances.info
   cd ec2instances.info
   docker build -t ec2instances.info .
   docker run -d --name some-container -p 8080:8080 ec2instances.info # start a container
   ```
2. `docker exec -it some-container bash -c "invoke build" # update files`
