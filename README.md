## thrift-js

This is a stripped-down version of the thrift js library installable
standalone and containing a number of performance optimisations.

Its primary purpose is to support the Ably browser client library and therefore
it excludes support for:

- RPC;
- any transport other than TTransport;
- any protocol other than TBinaryProtocol.

Support for other transports/protocols may be added in the future.

There is an Ably fork of thrift, and this project tracks changes to that
project.