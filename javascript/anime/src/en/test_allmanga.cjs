const q = 'query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { pageInfo { total } edges { _id name englishName nativeName thumbnail availableEpisodes __typename } } }';
const vars = {search: { allowAdult: false, allowUnknown: false, sortBy: 'popular' }, limit: 26, page: 1, translationType: 'sub', countryOrigin: 'ALL'};
fetch('https://api.allanime.day/api', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Origin': 'https://allmanga.to',
        'Referer': 'https://allmanga.to/'
    },
    body: JSON.stringify({query: q, variables: vars})
})
.then(r=>r.text())
.then(t=>console.log(t.substring(0, 500)))
.catch(e => console.log(e));
