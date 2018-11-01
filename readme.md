# ECB Currency Convertor Demo-app

Converts currencies supported by the European Central Bank.
More Info: [ECB Reference Rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)

Reference rates are usually updated around 16:00 CET on every working day, except on TARGET closing days.

## Supported Routes

1) Current Euro Foreign Exchange Rates
```
http://:host:port/api/convert/:currency/:foreign_currency/:amount
```

2) Historical Euro Foreign Exchage Rates: last 90 days.

```
http://:host:port/api/convert/h/:date/:currency/:foreign_currency/:amount
```

### Examples

* **Daily** exchange reate: _euro_  -> _usd_

```bash
http://localhost:3000/api/convert/eur/usd/10.2
````

&nbsp;&nbsp;&nbsp;&nbsp; JSON response
```bash
base_currency	"EUR"
target_currency	"USD"
amount	10.2
raw	11.77896
result	11.78
ts	1538647987715
rates	
eur->usd	1.1548
usd->eur	0.8659508139937652
````

* **Daily** exchange reate: _usd_  -> _eur_

```bash
http://localhost:3000/api/convert/eur/usd/10.2
````

&nbsp;&nbsp;&nbsp;&nbsp; JSON response
```bash
base_currency	"USD"
target_currency	"EUR"
amount	10.2
raw	8.832698302736404
result	8.83
ts	1538648065233
rates	
usd->eur	0.8659508139937652
eur->usd	1.1548
````

* **Historical** exchange reate: _eur_  -> _usd_
```
http://localhost:3000/api/convert/h/2018-10-19/usd/eur/10.2
```

* **Historical** exchange reate: _usd_  -> _GPB_
```
http://localhost:3000/api/convert/h/2018-10-19/usd/gbp/10.2
```

* **error response**: 
```
{
    err: "Some Message",
    supportedCurrencies: [...] // string[],
    supportedDayes: [...] // string[]
}
```

### Development

```bash
nom install
npm run build
npm run watch
```
### Production

```bash
nom install
npm run build
npm run serve
```
### Running tests

```bash
npm test
```

### Linting

```bash
npm run tslint
```

### Building a container

```bash
docker build .
```
