### Improvements:

Note: The website is working fine all the cold start issues have been resolved as well. Still make improvements in these areas.

1. There is an issue that cookies are being deleted in the dev env but not i production.This has cause the user to  log back in after refresh. This is most likely because a custome domain is not being used on vercel and that is causing issue. Code has no problem. So, buy a domain and fix that.

2. When the payment is succeeds is takes a lot of time to show the updated cart, so even after the payment is made the products are still shown in the cart until the database operations update the database and the user refreshes the page again so make is so that after the payment is done freeze the Navigation for a couple of seconds to give time to the operations to compelete and then automatically redirect users to their history when it is fetched.

3. Cold Start is still happening on the first payment occasionlly. Find a way to avoid it, or shift the deployed to a VPS based hosting service.