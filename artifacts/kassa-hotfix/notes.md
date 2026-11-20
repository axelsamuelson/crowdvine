# kassa-hotfix screenshot notes

- git HEAD (code under test): `1e0ad0f17c06225367a372f8eca8585ca6bcdc15`
- HEAD committer date: 2026-11-20 07:24:19 +0000
- notes written at (UTC): 2026-11-20T07:39:02Z
- APP_URL: http://localhost:3000
- Stripe: .env.local uses pk_test_ / rk_test_ (TEST) against Supabase TEST project msdfjrrokcmjifetuwgc
- Guest Payment Element: POST /api/checkout/payment-intent returned HTTP 200 after ensure-session; Stripe card fields visible; test card 4242 filled; CTA enabled (Betala nu). Not submitted.
- PE root cause fixed in this HEAD: AbortController races cancelled successful PI 200s; now cancelled-flag + fulfillment_channel on PI body.

## Files
- 1440-postnummer.png md5=`3745c701edfb674d9b6fdd963c639db5` mtime=2026-11-20T07:35:41Z bytes=52413
- 1440-shared_pallet.png md5=`bfa8659bd73cc63b7fceee37852eb2b8` mtime=2026-11-20T07:36:12Z bytes=63393
- 1440-direct_box.png md5=`306ebd145c560b4f5a9a66209b02dc61` mtime=2026-11-20T07:36:42Z bytes=62370
- 1440-saved-address-age.png md5=`03fe94a562e07a1dcf61523796e8e29c` mtime=2026-11-20T07:29:38Z bytes=66877
- 1440-age-terms.png md5=`21fac8d84c5741c871910a1684c95366` mtime=2026-11-20T07:29:38Z bytes=67228
- 1440-payment-element-direct_box.png md5=`d9261b276c6ab74ff1796b90e3ec56e6` mtime=2026-11-20T07:29:51Z bytes=65404
- 1440-payment-element-shared_pallet.png md5=`233a5381449069c8f73fa405a607273f` mtime=2026-11-20T07:30:43Z bytes=61933
- 390-postnummer.png md5=`dce808a8848e30215a071c888cd1441a` mtime=2026-11-20T07:36:52Z bytes=121758
- 390-shared_pallet.png md5=`161a712d832d9f15110f993fc48e6c57` mtime=2026-11-20T07:37:54Z bytes=177725
- 390-direct_box.png md5=`5b0bb1459ea2830f06b5bb9251f602e6` mtime=2026-11-20T07:38:24Z bytes=174528
- 390-saved-address-age.png md5=`41c8c1c382d9c3a21c52212db28e3653` mtime=2026-11-20T07:32:33Z bytes=181461
- 390-age-terms.png md5=`699664b75ab7ffefa24d6a54c4ce54e9` mtime=2026-11-20T07:32:35Z bytes=184062
- 390-payment-element-direct_box.png md5=`6d1cf4a0656153b1544b49a5a5e03dca` mtime=2026-11-20T07:33:21Z bytes=213680
- 390-payment-element-shared_pallet.png md5=`61d90ceac20c9046d10423d2f9283156` mtime=2026-11-20T07:34:40Z bytes=217959

## Distinctness
- 390-postnummer.md5 != 390-shared_pallet.md5: verified
- 1440-postnummer.md5 != 1440-shared_pallet.md5: verified

## Stockholm wall times (approx)
- commit HEAD: 2026-11-20 07:24:19 +0000 (UTC) = ~2026-11-20 07:24:19 +0000
- earliest required shot mtime: see Files (all after commit)
