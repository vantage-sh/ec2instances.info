# ec2instances.info

I was sick of comparing EC2 instance metrics and pricing on Amazon's site so I made this. Improvements welcome!


### Running locally

1. Clone the git repo
2. `cd ec2instances.info/`
3. `pip install -r requirements.txt`
4. `fab build`
5. `fab preview`


### Requirements

- Python 2.7+
- [Fabric](http://docs.fabfile.org/en/1.8/) 1.1+
- [Boto](http://boto.readthedocs.org/en/latest/)
- [Mako](http://www.makotemplates.org/)
- [lxml](http://lxml.de/)

### Deployed to ec2instances.info by Travis CI
[![Build Status](https://travis-ci.org/powdahound/ec2instances.info.svg)](https://travis-ci.org/powdahound/ec2instances.info)
