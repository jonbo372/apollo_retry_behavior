Tested on: 
* Node v18.20.4 and
* Node v20.18.2

Just a simple hack to test the retry behavior of Apollo Client, especially 
focused around networking errors.

An even uglier hack is a small http server which I used to test various
scenarios, such as sleep for a long time to trigger a timeout. Also, having
the client connect to this server and then kill it to severe the connection
without a response. And of course, don't even start it and see the behavior.

Other tests, using iptables to cut connections and more (so a tiny bit of
"chaos" testing). Guess I could have used Gremlin or something but didn't.

Have not been able to figure out how to set:
* TCP socket timeout etc.
* Connection pooling settings, such as connection re-use, max open connection etc

