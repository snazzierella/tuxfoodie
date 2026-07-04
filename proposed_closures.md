# Proposed Closures Verification List

We have audited the database and found **2** restaurants that appear to be permanently closed on Google Maps or search results.

### Instructions for Verification:
1. Review the list below.
2. Open [proposed_closures.json](file:///home/snazzierella/antigravity/busy-maxwell/proposed_closures.json) in your editor.
3. For any restaurant that is indeed permanently closed, change `"verified": false` to `"verified": true`.
4. Run `npx tsx scripts/apply-closures.ts` to remove verified closed restaurants from the database.

| Status | Restaurant | Neighborhood | Distance | Evidence | Search Query Used |
| :---: | :--- | :--- | :---: | :--- | :--- |
| ⏳ Pending Review | **Alafia West African** | Central & Midtown | 1.6 mi | Direct title match: "Alafia West African Cuisine closed, seeking new owner" on 2019-12-04 (https://tucsonfoodie.com/2019/12/04/alafia-west-african-cuisine-closed/) | `WP API Category 58 search for "Alafia West African"` |
| ⏳ Pending Review | **Chicago Bar** | Central & Midtown | 3.4 mi | Direct title match: "Chicago Bar permanently closes after over 40 years in business" on 2020-06-22 (https://tucsonfoodie.com/2020/06/22/chicago-bar-permanently-closes/) | `WP API Category 58 search for "Chicago Bar"` |
