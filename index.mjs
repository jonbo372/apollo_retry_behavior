import {
  ApolloClient,
  createHttpLink,
  InMemoryCache,
  gql,
} from "@apollo/client/core/index.js";
import { RetryLink } from "@apollo/client/link/retry/index.js";
import { from } from "@apollo/client/link/core/index.js";
import { ApolloError } from "@apollo/client/errors/index.js"; // Specific error types

const httpLink = createHttpLink({
  uri: 'http://localhost:4000',
  // uri: 'https://spacex-production.up.railway.app/',
  fetch: (url, options) => {
    const fetchOptions = {
      ...options,
      signal: AbortSignal.timeout(5000),
    };

    return fetch(url, fetchOptions);
  },
});

const NETWORK_ERROR_CODES = [
  "ETIMEDOUT",
  "ENETDOWN",
  "ENETRESET",
  "ENETUNREACH",
  "ECONNABORTED",
  "ECONNRESET",
  "EMFILE",
  "ECONNREFUSED",
  "ECONNREFUSED",
  /**
   * Undefined (?) socket error - will happen when you kill
   * the connection mid-through e.g.
   */
  "UND_ERR_SOCKET",
];

function unwindErrors(error) {
  if (!error.cause) {
    return error;
  }
  
  return unwindErrors(error.cause);
}
/**
 * 
 */
function isRetryableNetworkError(error) {
  const code = unwindErrors(error).code;
  return NETWORK_ERROR_CODES.includes(code);
}


// Not much on the Retry Link... Nothing at all really...
// https://www.apollographql.com/docs/react/api/link/apollo-link-retry
const retryLink = new RetryLink({
  delay: {
    initial: 100,
    jitter: true,
    max: 1000,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      
      // https://www.apollographql.com/docs/react/api/link/apollo-link-http#handling-errors
      // 
      
      // That a network error is wrapped in a TypeError makes no sense...
      if (error instanceof TypeError) {
        if (isRetryableNetworkError(error)) {
          return true;
        }
        
        // I assume the rest of the TypeErrors are actually Type Errors
        // and as such, shouldn't be retried.
        return false;
      }

      // I guess this is handled differently but would make more sense
      // if this then also was wrapped as a TypeError (although that one
      // still doesn't make sense but at least it is consitent)
      //
      // Also, I guess I don't have to check the instanceof...
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        console.error("Retrying due to timeout");
        return true;
      }
      
      // No clue if this is the preferred way and if this will continue to
      // be supported but works for this version...
      if (error.name === 'ServerError' && error.statusCode) {
        // Note that if there was a body in the error response you'll find it in
        // error.result. It's being parsed and attached to the error at 
        // @apollo/client/link/http/parseAndCheckHttpResponse.js:120
        // also see https://www.apollographql.com/docs/react/api/link/apollo-link-http#handling-errors
        return error.statusCode >= 400 && error.statusCode < 600;
      }

      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error(error);

      return false; 
    },
  },
});

const client = new ApolloClient({
  link: from([retryLink, httpLink]), 
  cache: new InMemoryCache()
});

// Define the GraphQL query
const GET_LAUNCHES = gql`
    query GetLaunches {
        launches(limit: 5) {
            mission_name
            launch_date_local
            launch_success
            rocket {
                rocket_name
            }
        }
    }
`;

// Function to execute the query
async function fetchLaunches() {
  try {
    console.log('Fetching SpaceX launches using Apollo Client...\n');

    const { data } = await client.query({
      query: GET_LAUNCHES
    });

    // Format and display the results
    data.launches.forEach(launch => {
      console.log(`Mission: ${launch.mission_name}`);
      console.log(`Date: ${new Date(launch.launch_date_local).toLocaleDateString()}`);
      console.log(`Rocket: ${launch.rocket.rocket_name}`);
      console.log(`Success: ${launch.launch_success ? 'Yes' : 'No'}`);
      console.log('-------------------');
    });

  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.error("We got the timeout error");
    } else if (error instanceof ApolloError) {
      console.error("Generic ApolloError");
      
      if (isRetryableNetworkError(error)) {
        console.log("I guess we gave up on a network error eventually");
      }
      
    } else {
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Network Errors:", error.networkError);
    }

  } finally {
    client.stop();
  }
}

fetchLaunches();