Ddrop is a microservice that lets you paste text files to a folder from a web-based interface.

Files:
- ddrop.js: Run this with node.
- ddrop.html: This is served by ddrop.js.
- ddrop.service: Used to initiate the systemd ddrop service.

Use:
- Configure the url and target folder in ddrop.js first. Make sure the target folder is not web-accessible, or someone could put a script there.
- I put ddrop behind nginx, which redirects anything that tries to go to /ddrop.* to the ddrop node service. It would be equally reasonable to run the service on it's own port, though.
