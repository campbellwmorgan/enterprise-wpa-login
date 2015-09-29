PEAP Enterprise WPA Login
=============

While the GNOME / Fedora team get going fixing the bug 
in NetworkManager that prevents login to enterprise WPA PEAP wifi
networks using the gui, this command line utility logs 
you on to a network using `wpa_supplicant` with a custom config 
file and then `dhclient` to request a lease.

N.B. This has only been tested so far on Fedora 22 with GNOME Desktop
In theory this should also work on Ubuntu with GNOME. Let me know if not


##Usage
		
Install the library:

			npm install -g enterprise-wpa-login


Then either:

Create config file: 

			// config.json

			{
				"ssid":"my_enterprise_network",
				"uid":"my@userid.com",
				"password:"mypassword"
			}

			// sign in using the config
			// (needs to be root in order to disable NetworkManager)
			sudo enterprise-wpa-login ~/config.json


Or:

			sudo SSID="my_enterprise_network" enterprise-wpa-login

			// then respond to prompts

