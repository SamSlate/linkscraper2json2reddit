const _        = require('lodash');
const bluebird = require('bluebird');
const request  = bluebird.promisify(require('request'));
const cheerio  = require('cheerio');
const hash     = require('string-hash');
const urls     = _.toPairs(require('./config/urls'));

bluebird.map(urls, function getJson([name, url]) {
  let json = _.attempt(require, `./json/${name}`);
  if (_.isError(json)) {
    json = {name, url,  hash: null, linkArray: []};
  }

  return json;

})
.then(allJsonObjects => {
  
  return bluebird.map(allJsonObjects, function getPage(jsonData) {
    let newJsonData = _.cloneDeep(jsonData);

    return request(jsonData.url)
    .then(response => {
      const $ = cheerio.load(response.body);
      const links = $('a');
      newJsonData.linkArray = _.map(links, link => {
        return {
          href: _.get(link, 'attribs.href'),
          class: _.get(link, 'attribs.class'),
          //TODO: didnt know what cheerios equivalent of textContent was
          text: _.get(link, 'html', '').replace(/[^a-z&A-Z0-9 -]/g," ").replace(/\s\s+/g, ' '),
          target: _.get(link, 'attribs.taget')
        };
      });
			newJsonData = hash(response.body);
      let newLinks = getNewLinks(newJsonData.linkArray, jsonData.linkArray);

      if (newLinks.length) {
        jsonData.hash = newJsonData.hash; //new content => new hash
        fs.writeFileSync(`json/${jsonData.name}.json`, JSON.stringify(jsonData));
      }

      return _.map(newLinks, newLink => {
        return {
          name: jsonData.name,
          value: newLink
        };
      });
    });
  });
  
})
.then(_.flatten)
.then(allNewRedditLinks => {
  console.log('allNewRedditLinks.length', allNewRedditLinks.length);
  //TODO: post these bad boys up to reddit
})
.catch(err => {
  console.log('err', err);
})


function getNewLinks(allLinks, oldLinks) {

  return _.filter(allLinks, isNewLink);
	
  //TODO: could clean this up further, but didn't want to think about it
  function isNewLink(link) {
		for (var i = 0; i < oldLinks.length; i++){			
      const oldLink = oldLinks[i];
      if (link.href === oldLink.href) {
        if (link.text.length <= oldLink.text.length) {
          return false;
        }
      }
      if (link.text === oldLinks[i].text) {
        return false;
      }			
		}
		return true; 
	}

}
