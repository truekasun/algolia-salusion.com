const IndexFactory = require('@tryghost/algolia-indexer');

exports.handler = async (event) => {
    const {key} = event.queryStringParameters;

    // TODO: Deprecate this in the future and make the key mandatory
    if (key && key !== process.env.NETLIFY_KEY) {
        return {
            statusCode: 401,
            body: `Unauthorized`
        };
    }

    if (process.env.ALGOLIA_ACTIVE !== 'TRUE') {
        return {
            statusCode: 200,
            body: `Algolia is not activated`
        };
    }

    const userAgent = event.headers['user-agent'] || '';
    if (!userAgent.includes('https://github.com/TryGhost/Ghost')) {
        return {
            statusCode: 401,
            body: `Unauthorized`
        };
    }

    const algoliaSettings = {
        appId: process.env.ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_API_KEY,
        index: process.env.ALGOLIA_INDEX
    };

    const {post} = JSON.parse(event.body);

    // Handle both Ghost v4 (object) and v5 (array) payload formats
    // Updated posts are in `post.current`, deleted are in `post.previous`
    let current = post?.current;
    let previous = post?.previous;
    if (Array.isArray(current)) {
        current = current[0];
    }
    if (Array.isArray(previous)) {
        previous = previous[0];
    }

    const source = (current && Object.keys(current).length && current)
                   || (previous && Object.keys(previous).length && previous);

    if (!source || !source.slug) {
        return {
            statusCode: 200,
            body: `No valid request body detected`
        };
    }

    const {slug} = source;

    try {
        // Instanciate the Algolia indexer, which connects to Algolia and
        // sets up the settings for the index.
        const index = new IndexFactory(algoliaSettings);
        await index.initIndex();
        await index.delete(slug);
        console.log(`Fragments for slug "${slug}" successfully removed from Algolia index`); // eslint-disable-line no-console
        return {
            statusCode: 200,
            body: `Post "${slug}" has been removed from the index.`
        };
    } catch (error) {
        console.log(error); // eslint-disable-line no-console
        return {
            statusCode: 500,
            body: JSON.stringify({msg: error.message})
        };
    }
};
