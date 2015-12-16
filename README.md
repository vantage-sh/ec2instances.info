# ec2instances.info

I was sick of comparing EC2 instance metrics and pricing on Amazon's site so I made this. Improvements welcome!


### Project status

I'm actively maintaining the site with the help of contributors here, but am not working on large new features.

People have suggested many neat ideas and feature requests but it remains unclear how long the site will be necessary. I've heard from teams at Amazon that they use the site internally and some have mentioned that that they might be building something similar. They certainly have access to better data.


### Running locally

Make sure you have LibXML and Python development files.  On Ubuntu, run `sudo apt-get install python-dev libxml2-dev libxslt1-dev`.

1. Clone the git repo
2. `cd ec2instances.info/`
3. `virtualenv env` (make sure you have virtualenv package installed)
4. `source env/bin/activate`
5. `pip install -r requirements.txt`
6. `fab build`
7. `fab preview`
8. `deactivate` (to exit virtualenv)


### Requirements

- Python 2.7+ with virtualenv
- [Fabric](http://docs.fabfile.org/en/1.8/) 1.1+
- [Boto](http://boto.readthedocs.org/en/latest/)
- [Mako](http://www.makotemplates.org/)
- [lxml](http://lxml.de/)

### Deployed to ec2instances.info by Travis CI
[![Build Status](https://travis-ci.org/powdahound/ec2instances.info.svg)](https://travis-ci.org/powdahound/ec2instances.info)
