const FRAMES = 150;
const GX = 12;
const GY = 4;
const EASE = 0.015;
const GAIN = 0.97;
const GAMMA = 1.85;
const GRAIN = 0.065;
const TILT = 2;
const LOGO = [141 / 1384, 85 / 778, 1060 / 1384, 553 / 778];
const GRID = 'gXBgao+71tPJxcG/kW9GUIeep7i+w7++u6uclaKYf1dciqGy0uDs4cuuflBKepSmgHBgao+71tPJxcHAkW9GUIeep7i9w7++u6uclaKYf1dbiqGy0uHs4syvf1FKe5SmgHBgao+71tPJxcHAkW9GT4eep7i9w7++u6uclaOYf1dbiqGy0uDs486wgVJLfJWngHBgao+71tPJxcLAkG9GT4eep7i9xMC/uquclqOZf1dbiqGz0eDt5NCyg1RNfZaogG9gao+71tPJxcLBkG9GT4eep7e9xMC/uquclqSZgFdbiqKz0eDt5dK0hVdPfpepf29gao+71tPJxcLBkG9GT4eep7e8xMHAuqqdlqWZgFdbiqK00eDt5tO1iFlRgJipf29gao+61tPJxsPCj25GT4iepre8xMHBuaqdl6WagVdbi6K10ODu59W3iltTgZmqf29gao+61dPJxsPCj25GT4iepra8xMHBuaqdl6aagVZbi6K10N/u6Na5jF1Vg5qrf29gao+61dPJxsTDj25GT4iepra7xMLCuKqdmKeaglZbi6O20N/u6di6jl9WhJusf29gao+61dPJxsTDj25GToieprW7xcLCuKmdmKebg1ZbjKO2z9/u6tm8kGFYhZysfm9fao+61dTJxsTDjm5GToieprW7xcPDuKmcmaibg1ZcjKO2z97u6tq9kmNbhp2tfm5fao+61NTIxsXEjm5GToieprW6xcPDt6mcmamchFZcjaS3zt7u69y/lWZeiJ6ufm5fao+51NTIxsXEjW5GTomepbS5xcTEtqicmqmchVZdjaS3zt7u693Bl2lhip+vfW5fao+509TIxsXFjW1GTomepbS5xcTEtqicmqqdhlZdjqW4zd3u7N7DmWxkjKCwfW5faY+509TIxsXFjG1GTomepbO4xcTEtaecm6qehlZejqW4zd3t7N/FnG5njaGwfW5faY+509PIx8bFjG1GTomepbK3xsXFtaecm6ueh1dejqa5zNzt7eHHnnJqj6KxfW5faY640tPHx8bGjG1GTomepLK3xsXFtKacm6yfiFdfj6a5zNvt7eLJoXVukKOyfG1faY640tPHx8bGi21GToiepLG2xsbGtKacm6yfiVhgj6e6y9vs7uPLo3lxkqSzfG1faY640dPHx8fHi21GToiepLC1xsbHs6WcnK2gillhkKi6y9rs7uTNpn10k6S0fG1eaY630dPHx8fHim1GToieo6+0x8bHsqWcnK6hi1pikKi7ytrs7uXPqYB4laW0e21eaY630NPGx8fHimxFToido6+zx8fHsqSbnK6ii1pikam7ydns7+bRq4R7lqa1e2xeaY630NPGx8fIiWxFToido66yx8fIsaSbnK+jjFtjkqq8ydjr7+fTrYd+mKe2e2xeaI22z9PFx8jIiWxFToido62yx8jIsaObnK+jjVxkkqq8yNjr7+jVr4qCmai3emxeaI22z9PFx8jIiGxFToidoqyxyMjJsKKanLCkjl1lk6u8x9fq7+jWso6Fm6q3emxeaI21ztLEx8jJiGtFToidoquwyMjJr6GanbGlj15mlKy8xtbq7+nYtJGInau4eWteaI21zdLEx8jJh2tFToidoaqvyMnKrqGZnbGmkF9nla29xtbp7+rat5SKnqy4eWteaI21zNLDx8nJh2tFToidoamuyMnKrqCZnbKmkWBolq29xdXp7+vcuZeNoK25eWtdaI20zNHDx8nKhmtFToidoaityMnKraCZnbKnkmFplq69xNTo7+vevJqPoa66eGtdaIy0y9HCx8nKhmtFToicoKeryMrLrJ+YnbOok2Jql6+9w9Pn7+zgv52Soq66eGpdaIyzytDBxsnKhWpFToecoKaqyMrLq56YnLOplGRrmbC+w9Lm7uzhwqCVpK+7d2pcZ4uzydDBxsnKhGpEToecn6SpyMrLqp2XnLOplWVtmrG+wtHm7u3jxKSYpbC7d2lcZ4uyyM/AxsnKhGlETYecn6OnyMrMqpyWnLSqlmdvm7K/wdDl7u3kx6ebprC8dmlcZ4uyx8+/xsnLg2lETYecnqKmyMvMqZuWnLSrl2hwnLO/wM/k7e7lyaqeqLG8dmlcZoqxxs6/xsrLg2lDTYecnqClycvMqJuVnLSrmGpynbS/v87j7e7my66iqrK9dWlbZoqwxc2+xsrLgmlDTYebnp+kycvNp5qVnLWsmWtznrW/vs3i7e7ozrGlq7O9dWhbZoqww8y9xcnLgmhDTYebnZ6iyczNppmUm7Wsmm11n7a/vczh7O7p0bSprbS+dGhbZoqvwsu8xcrLgWhDTYebnZyhyMzNpZiUm7Wtm253obfAvMvg7O7q07itr7S+dGdbZoqvwcq7xcrLgGdDTYebnJufyMzNpJiTm7WtnHB5orfAu8ne6+7r1ruwsbW/c2dbZomuv8m6xMrMgGdDTYebnJmeyM3Oo5eSmrWunXJ7o7jAucjd6u7s2b+0srW/c2dbZomuvsi5xMrMf2dDTYebm5icyc3OopaSmrWunnR9pbnBucfc6u7t28K3tLa/cmZaZYmtvce4xMrMfmZDTYebm5eayc7OoZWRmbWvn3V+prrBuMbb6e7u3cW6tbfAcmZaZYisu8a3w8rMfWZCTYaampWZyc7PoZWQmbWvoHeAp7vBt8Xa6O7v38i8trfAcWVZZIirusS1w8rMfWVBTYaampOXyc7PoJSPmLWwoXqCqbzBtsTZ5+7v4cu/uLjAcGRYZIerucO0wsrNfGRBTIaamZGWyM7Pn5OPmLWwonuEqrzCtcPX5u7w487BubjBcGRYZIeqt8KzwsrNe2RATIaamZCUyM/PnpOOl7Wxo32Fq73CtMLW5e3w5dHDu7nBb2RYZIeqtsGywsrNe2RATIaZmI6TyM/PnZKNlrWxo3+Hrb3Cs8HV5O3w59PGvLnBb2NYY4eptb+xwcrNemNATIaZmI2RyM/QnJGNlrWypIGIrr7DssDT4+3w6NXHvrrCbmNXY4aps72vwcrNemNATIaZmIuPyM/Qm5GMlbSypYOKsL/Dsb/S4uzw6tjJv7vCbmJXY4aosruuwMrNeWI/TIaZl4qOyM/QmpCLlLSypoWLsb/DsL7R4ezw69rLwLvDbWJXY4aosbqtv8nNeWI/TIWZl4iMx8/QmY+KlLSyp4eNs8DEr73P4Ovw7dzNwrzDbWJWYoWnsLirv8nNeGE/TIWZloaLx9DRmY+Jk7SzqImOtMDErr3O3uvw7t7Pw73EbWFWYoWnr7eqvsnNeGE/S4WYloWJx9DRmI6JkrOzqIqPtcHErrzM3erw7+HRxb3EbGFWYoWmr7apvsnNd2A+S4WYlYOIx9DRl42IkrOzqYyRtsHErbvL3Onw7+PTxr7EbGBVYYSlrrWovcnNd2A+S4WYlYKGxtDRl42HkbKzqo6TuMLErLvK2+nw8OTVyL/Ea19UYYSkrbOnvMjNdl89SoSYlICExtDRloyGkLK0q5CUucLFq7rI2ejw8ObXyb/Fal9UYIOkrLKlvMjMdl48SoSXk36CxdDRlYuFj7G0rJKWusLFqrnH2Ofw8OjZy8DFal5TYIOjrLCku8jMdV48SoSXk32AxdDQlIqEjrG0rJSYu8PFqrjF1ubw8OrbzMDFaV5TYIKiq6+iusfMdV08SoSXknt+xM/Qk4mDjbC0rZWavMPFqbfE1ebw8OvdzsHGaV1TX4Khqq2hucfLdFw7SYSWknl8xM/QkoiCjLC0rpebvcPFqLbC1OXw8Ozez8LGaF1SX4GgqaufuMbLdFs7SYOWkXh6w8/QkoeBi6+0r5mdv8TGprXB0uTw8O7g0MPHaFxRXoGgqKmet8bLc1s6SIOWkHZ4ws7QkYeAi660r5ufwMTGprS/0ePw8O7h0cTIZ1tRXoCfp6ectsXKc1o5SIKVkHV3wc7PkIZ/iq20sJ2hwMTGpLO90OLw8O/i08TIZltQXX+epqWatcTKclk5SIKVj3N1wM7Pj4V+ia20sJ6jwcTGo7K8zuHw8PDk1MXIZlpQXX+epaOZtMPJcVk5R4KVj3Jzv83PjoV9iKy0saCkwsTGorG6zeDw8PDl1cbIZVpQXH6do6CXs8PIcFg5R4GVjnByvs3OjYR8h6uzsaGmwsTFobC5zN/w8PDm1sbJZFlPXH6cop6VscLIcFg4R4GUjm9wvczOjIN7h6qzsaOnw8TFoK+4y97v8PDn18fJZFhOW32boZyTsMHHb1c4RoCUjW1vvMvNi4J6hqmzsqSpw8XFn662ydzv8PDo18fJY1hOW3yaoJmSr8DGblY3RoCUjWxtu8vNioF5hamysqaqxMXGnq21yNvv8PDp2MjKY1dOWnyZnpaQrr/GblY3Rn+TjGtsucrMiYB4haiys6esxMXGnauzxtru8PDq2cjKYldNWnuYnZSOrL7FbVU3Rn+TjGpruMnMiH93hKeys6itxMXGnKqyxdnu8PDr2cjKYVZNWXqXm5GMq73EbVU2RX6Ti2lpt8jLh352g6axs6quxMXFm6mwxNft8PDs2sjKYVVMWXqWmY6LqbzDbFQ2RX2SimhotcfKh310gqWxtKuwxMXFmqivw9bs8PDs28jKYFVLWHmVmIyJqLvCa1M1RH2SimdntMbJhnxzgaSxtKyxxcTFmaatwtXr8PDt3MnKX1RLV3iUloqIp7nBalI1RHySiWdns8XIhXtygaOwtK2yxcTEmKWswdTq8PDu3MnKXlNKV3iTlYeGpbjAaVI0Q3uRiWZmscPHhHtxgKOwtK6zxcTEl6Sqv9Pp8PDu3cnKXlNKV3eTk4WFpLe/aFE0Q3uRiGZlsMLGg3pwf6KvtK+0xcTElaKovtLo8PDv3cnKXVJJVnaRkYODorW9aFA0Q3qRiGVlrsHFgnlwf6GvtbC1xcTElKGnvdHn8PDv3snKXFFJVXWQj4CCobS8Z1AzQnqQh2Vkrb/EgXhvfqCutbC2xcPDk6CmvNDm8PDv3snKW1FIVHSPjX6BoLO7Zk8yQXmQh2VkrL7DgHdtfZ+ttbG3xcPCkp6ku87k8PDv38nKWlBHVHOOjHx/nrG5ZU4yQXiQhmVkqrzCf3ZtfJ6ttbK4xMPCkZ2jus3j8PDv38rJWk9HU3ONint+nbC4ZE0xQHePhmVjqbvAfnVse56stbO5xMLBj5uiuczh8PDw38rJWU9GU3KMiXl9nK+3Y00xQHePhWRjqLm/fXRre52stbO6xMLAjpqht8rg7/Dw4MrJWE5GUnGLh3d8m622YkwxP3aOhWRjpri+fHRqepyrtbS6xMHAjZmftsnf7vDw4MrJV01FUXCJhXV7mqy1YUwwPnWOhGVjpbe9e3NpeZuqtbS7xMC/jJietcjd7vDw4crIVkxEUG+Ig3N7mauzYEswPnWNhGVkpLa8enJoeJqqtbW8xMC/i5adtMbb7fDw4crIVUxEUG6GgnJ6mKqyX0ovPXSNg2Vko7S7eXFnd5qptbW8w7++ipWbssXa7PDw4srIVEtDT26FgHB5l6mxXkkvPXSMg2VkorO6eHBmdpmptba9w76+iJOascTY6/Dw4srIVEpDT22Ef254lqiwXUkvPXOLgmRkobK4d29ldZiotLa+w729h5KYr8LX6fDw4srIU0pCTmyDfWx3laevXEguPHKLgmRloLG3dm5kdJentLa+w728hpGXrsHV6PDw4srIUklBTWuCfGt3lKauW0ctPHGKgWRloLC2dW1jc5amtLe/w7y8hZCWrb/U5/Dw4srHUUhATGqAeml2lKWtWkYtO3CJgWRmn6+1dGxicpWmtLe/w7u7hI+Vq77S5vDw48nHUEdATGl/eWd2k6WtWkYsOnCIgWRnnq61c2thcZWls7e/w7u7g46UqrzQ5PDw48nHUEc/S2h+eGZ1kqSsWUUrOm+IgWRnnq60cmtgcJSks7e/w7q6go2TqbvO4+/w48nGT0Y+S2d9d2V1kqSsWEUrOm6HgGRonq20cWpfb5Oks7fAw7q6gYySp7nN4u/w48nGTkU+Smd8dmN1kqOrV0QqOW6GgGRpna2zcGlebpKjsrjAw7q5gYuRprjL4e7w5MjGTUQ9SWZ7dGJ0kaOrVkMqOW2GgGVqnayzb2ldbZGisrjAxLq5gIuPpLbK4O7v5MjFTEM8SGV6c2B0kaKqVEIpOGyFf2VrnKyybWhca5ChsbjAxLm5f4qOo7TI3u3v5MjFS0I8SGR5cl90kKKqU0EpN2uEf2VsnKuybGdbao+hsbjBxbm4fYmNobPH3ezv5MjESkI7R2N4cV5zkKKqUkApN2uEf2VsnKuya2ZaaY6gsbjBxbq4fIiMoLHF2+vv5cjESkI7R2N4cFxzkKGpUkApN2qDfmVtm6uyamVZaY2fsLjBxrq4e4eKnrDD2uru5cjESUE7R2N3bltzkKGpUUAoNmqCfmVum6qxamRYaIyesLjBxrq4eoaJnK7C2Onu5sjESUE6RmJ3bVpzkKGpUT8oNmmBfmVvm6qxaWRXZ4uer7fBx7u3eoWIm6zA1uju5snESEA6RmF2bFhyj6GpUD4nNmiBfWVwm6qxaGNWZoqdrrfBx7u3eYSGmau/1eft5snER0A5RWF1a1dyj6CoTz4nNWiAfWVxm6mxZ2JVZYmcrrfByLy3eIOFmKm90+Xs58rERz85RWB1alZyj6CoTz0nNWd/fWVym6mwZmFUZIibrbfByL23d4KElqe80eTs58vERj84RGB0aVVyj6CoTj0mNWZ/fGVzm6mwZWBTY4ebrbfByL63dYGDlaa60OPr58zFRj44RF9zaFRyj6CoTTwmNGZ+fGZzm6mxZF9SYoaarLbAyb+4dH+Bk6S4zuHr6M3FRT03Q15yZlNyj6CpTDslM2V9fGZ1m6mxY15RYYWZq7bAycC4c35/kqO3zODq6M7GRDw2Ql1xZVJyj6GpSzokM2R9e2Z2m6mxYV1QX4OYq7bAysK5cXx+kKG1y9/p6M/GQzs1QVxwY1FykKGpSjkjMmN8e2Z3m6myYFxOXoKYqrXAysO5cHt8j6C0yd3o6NDHQjs1QVxwYlBykKGqSjkjMmJ8e2Z3nKqyYFtOXoGXqbW/ysS6b3p7jp6zyNzn6NHHQjo1QFtvYlBzkKGqSjgjMmJ7emd4nKqzX1pNXYCWqbS/ysW7bnl6jZ2yxtrn6NLIQTo0QFtuYU9zkKKrSTgjMWF7emd5nKqzXlpMXH+VqLS+y8a8bXh5i5yxxNnm6NPJQTk0QFptYE9zkKKrSDciMWF6eWd5nKq0XVlLW36Up7S+y8e9bHZ3ipqww9fl6NTKQDgzP1ltX05zkaKsRzYhMWB6eWd6naq1XFhKW32UprO9y8i+a3V2iZmvwdbk6NXLPzgyPllsXU5zkaOsRjUhMF95eWh7nau2W1dJWnyTprO9y8m/anN0h5itwNXj6NXMPjcyPlhrXE1zkaOtRTUhMF55eGh7nau3WlZIWXuSpbK8y8rAaHJzhpasvtPi6NbNPTYxPVdrW01zkaOtRDQgL154eGh8nau4WVVHWHqRpLK8y8rCZ3BxhZWrvdHh59fOPDUxPVdqWkx0kqSuQzMgL114eGh9nqy4WFRGV3mRpLG7y8vDZm9whJSqvNDg59fPOzQwPFZpWUx0kqSvQjIfLlx3d2h+nqy5VlJFVniQo7G6y8zEZG5vgpKpus7f59jPOjMvO1VoWEx0kqWwQTEeLVt3d2l+nq26VVFEVXiPorC6y83FY2xtgZGouc3d5tjQOTMuOlRnV0t0k6WwQDEeLVp2dml/nq27VFBDVHeOoa+5y83GYmtsgJCnt8vc5djROTIuOlRnVkt1k6axQDAeLFp2dml/nq68VE9CU3aOoa+4y87HYWprfo+mtsrb5djROTIuOlNmVkt1k6axPzAdLFl1dWmAn668U09BU3aNoK64y87IYGhqfY6ltcja5NjSODItOVNmVUt1k6ayPi8dLFl1dWmAn669Uk5AUnWMn663ys7IXmdoe42ktcfZ5NjSNzEtOVJlVEt1k6eyPS4dK1h0dGmBn669UEw/UHSLnq22ys/JXWVmeoyitMbX49jTNjAsOFFjU0p1lKeyPC4cKldzdGmBn6++T0s+T3OKnqy2ys/KW2NkeIqhs8TW4tjTNS8rN1BjUkp1lKezOy0cKlZyc2mBn6++Tkk9TnKJnay1yc/KWmFjd4mgssPV4djUNC4rNk9iUkp1lKezOiwcKVVyc2mCn6+/TUg8TXGInKu0yc/LWGBhdYifsMHU4djUNC4qNk9hUUp1lKizOiwbKVRxcmqCn6+/TEc7THCHm6qzydDLV15gdIeer8DT4NfUMy0qNU5gUUp2lKi0OSsbKFRwcmqDn6/AS0Y6S2+GmqqyyNDMVl1ecoacrr/S39fVMi0pNU1fUEp2lKi0OCsaKFNvcWqDoLDASUU5Sm6FmqmyyNDMVFtdcYSbrb3R3tfVMSwpNExeT0p2lai0NyoaJ1JvcWqEoLDASEQ4SW2Fmaixx9DNU1pcb4KZq7zP3dfVMSsoM0tdTkp2lai0NikZJ1FucGqEoLDBR0M3SGyEmKewx8/NUllabYGYqrvO3NbVMCsoM0tdTkp2lai1NSkZJ1FtcGqEoLDBRkI3R2uDl6avxs/NUVhZbH+WqbrN29bVLyonM0pcTkp2lai1NSgZJlBtcGqEoLDBRUE2RmqClqauxs/NUFZYan6Vp7jM29bVLyonMkpbTUp2lam1NCgYJk9sb2qFoLDBREA1RWmBlaWuxc/NTlVXaH2UprfK2tXVLikmMUlaTUp3lam1MicYJU5rb2qFoLDBQz80Q2iAlKStxM/OTVNVZnuSpbbJ2dXVLSglMEhZTEp3lam1MSYXJE1qbmqFoLDBQT4zQmZ/lKSsxM7OS1JTZXqRo7XI2NXVLCclMEdZS0p3lam1MCYXJExpbmmFoLDCQD0yQWV+k6Orw87OSlBSY3iPorPG19TVKyckL0ZYS0p3lam1LyUXI0tpbWmFoLDCPzwxQGR9kqKqws7OSU9RYneOoLLF1tTVKyYkL0ZXS0p3lai1LyUWI0tobWmFn7DBPjswP2N8kaGpws3OSE5PYHWMn7DD1dPUKiYjLkVXSkp3lai1LiQWIkpnbWmFn6/BPTovPmJ8kKCowc3OR01OX3OLna/C1NLUKSUjLkRWSkp3lai1LSQWIklnbGmFn6/BPDkuPWF7j6CnwM3ORUtMXXKJnK3A0tLTKSUiLURVSkp2lKi0LSMVIUlmbGmFn6/BOjgtPGB6jp+mwMzOREpLW3CImqy+0dHTKCQiLUNVSkp2lKe0LCMVIUhla2mFnq7BOTcsO195jZ6lv8zNQ0lJWW6GmKu90NHSKCQiLUNVSkp2lKe0LCMVIUhla2mFnq7AOTYsOl54jJ2kvsvNQkhIWGyEl6m7ztDSKCQiLENUSUp2lKe0LCMVIUhka2mFnq7AOTYsOV14i52kvcvNQkhIV2uDlai6zdDSKCQiLENUSUp2lKe0KyMVIUhka2iFnq7AOTYsOV13i52jvMvNQkdIVmqClKi4zM/SKCQiLENUSUl2lKe0KyMVIUhka2iFnq7AODYrOV13ip2jvMrOQkdHVmqBk6e3y8/S';

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSharp;
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uC;
uniform sampler2D uRamp;
uniform sampler2D uGrid;
uniform vec4 uLogo;
uniform float uTilt;
uniform float uAmp;
uniform float uCur;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hat(float x, float lo, float mid, float hi) {
  if (x <= mid) {
    if (lo >= mid) return 1.0;
    return clamp((x - lo) / (mid - lo), 0.0, 1.0);
  }
  if (hi <= mid) return 1.0;
  return clamp(1.0 - (x - mid) / (hi - mid), 0.0, 1.0);
}

void main() {
  vec2 p = clamp((vUv - uLogo.xy) / uLogo.zw, 0.0, 1.0);
  vec2 g = vec2((p.x * ${GX - 1}.0 + 0.5) / ${GX}.0, (p.y * ${GY - 1}.0 + 0.5) / ${GY}.0);
  float s = texture2D(uGrid, g).r * 5.0 + uTilt * (0.5 - p.y) * ${TILT.toFixed(2)};
  float dc = (p.x - uCur) / 0.2;
  s += 0.75 * exp(-dc * dc);
  float fl = log(2.6);
  s = fl + max(s - fl, 0.0) * uAmp;
  s = min(s, log(45.0));

  float l0 = log(0.5);
  float l1 = log(2.0);
  float l2 = log(4.0);
  float l3 = log(8.0);
  float l4 = log(16.0);
  float l5 = log(30.0);
  float l6 = log(55.0);
  float l7 = log(100.0);

  vec3 pa = texture2D(uA, vUv).rgb;
  vec3 pb = texture2D(uB, vUv).rgb;
  float c = hat(s, l0, l0, l1) * texture2D(uSharp, vUv).r;
  c += hat(s, l0, l1, l2) * pa.r;
  c += hat(s, l1, l2, l3) * pa.g;
  c += hat(s, l2, l3, l4) * pa.b;
  c += hat(s, l3, l4, l5) * pb.r;
  c += hat(s, l4, l5, l6) * pb.g;
  c += hat(s, l5, l6, l7) * pb.b;
  c += hat(s, l6, l7, l7) * texture2D(uC, vUv).r;

  float v = pow(clamp(c * ${GAIN.toFixed(3)}, 0.0, 1.0), ${GAMMA.toFixed(3)});
  float noise = hash(gl_FragCoord.xy + 17.0) - 0.5;
  float gi = clamp(v * 201.0 + noise, 0.0, 196.0);
  vec3 base = texture2D(uRamp, vec2(0.5 / 197.0, 0.5)).rgb;
  vec3 col = max(texture2D(uRamp, vec2((gi + 0.5) / 197.0, 0.5)).rgb - base, 0.0);
  float grain = hash(floor(gl_FragCoord.xy));
  float amp = ${GRAIN.toFixed(3)} * (1.0 - smoothstep(0.72, 0.98, v));
  col *= 1.0 - amp * step(0.5, grain);
  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  col += base * smoothstep(0.0, 0.6, alpha);
  gl_FragColor = vec4(col, alpha);
}
`;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

function heroReady() {
  window.__heroReady = true;
  window.dispatchEvent(new Event('hero-ready'));
}

function useFallback(video) {
  if (!video) return heroReady();
  const img = document.createElement('img');
  img.className = video.className;
  img.setAttribute('aria-hidden', 'true');
  img.onload = img.onerror = heroReady;
  img.src = 'hero-glow/fallback.png';
  video.replaceWith(img);
}

function setupTexture(gl, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export function initHeroGlow(video) {
  if (!video) return heroReady();
  const canvas = document.createElement('canvas');
  canvas.className = video.className;
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return useFallback(video);

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    return useFallback(video);
  }
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4f(gl.getUniformLocation(program, 'uLogo'), ...LOGO);

  const grid = Uint8Array.from(atob(GRID), (ch) => ch.charCodeAt(0));
  const cell = GX * GY;
  const frame = new Uint8Array(cell);
  const names = ['uSharp', 'uA', 'uB', 'uC', 'uRamp'];
  const files = ['glow-sharp.png', 'glow-a.png', 'glow-b.png', 'glow-c.png', 'ramp.png'];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  let target = 0;
  let current = 0;
  let targetY = 0;
  let currentY = 0;
  let targetA = 1;
  let currentA = 1;
  let targetC = 0.5;
  let currentC = 0.5;
  const uCur = gl.getUniformLocation(program, 'uCur');
  const uAmp = gl.getUniformLocation(program, 'uAmp');
  const uTilt = gl.getUniformLocation(program, 'uTilt');
  let drawn = -1;
  let prev = 0;
  let visible = true;

  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(2, Math.round(rect.width * 2));
    const h = Math.max(2, Math.round(rect.height * 2));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      drawn = -1;
    }
  };

  const draw = (t) => {
    gl.uniform1f(uTilt, currentY);
    gl.uniform1f(uAmp, currentA);
    gl.uniform1f(uCur, currentC);
    const f = t * (FRAMES - 1);
    const i = Math.min(Math.floor(f), FRAMES - 2);
    const k = f - i;
    const m = (1 - t) * (FRAMES - 1);
    const mi = Math.min(Math.floor(m), FRAMES - 2);
    const mk = m - mi;
    const u = Math.max(0, Math.min(1, (0.5 - t) / 0.25));
    const w = u * u * (3 - 2 * u);
    for (let j = 0; j < cell; j++) {
      const own = grid[i * cell + j] * (1 - k) + grid[(i + 1) * cell + j] * k;
      const r = j - (j % GX) + (GX - 1 - (j % GX));
      const mir = grid[mi * cell + r] * (1 - mk) + grid[(mi + 1) * cell + r] * mk;
      frame[j] = Math.round(own * (1 - w) + mir * w);
    }
    gl.activeTexture(gl.TEXTURE5);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GX, GY, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, frame);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const touch = window.matchMedia('(hover: none) and (pointer: coarse)');
  const AUTO_MS = 16000;

  const tick = (timestamp) => {
    if (touch.matches) {
      const ph = (timestamp / AUTO_MS) * Math.PI * 2;
      const t = 0.5 - 0.5 * Math.cos(ph);
      target = 0.08 + 0.84 * t;
      targetC = -0.1 + 1.2 * t;
      targetY = 0.35 * Math.sin(ph * 0.63);
      targetA = 1;
    }
    const dt = prev ? Math.min(timestamp - prev, 100) : 16.67;
    prev = timestamp;
    if (calm.matches) {
      current = target;
      currentY = targetY;
      currentA = targetA;
      currentC = targetC;
    }
    else {
      const a = 1 - Math.pow(1 - EASE, dt / 16.67);
      current += (target - current) * a;
      currentY += (targetY - currentY) * a;
      currentA += (targetA - currentA) * a;
      currentC += (targetC - currentC) * a;
      if (Math.abs(targetC - currentC) < 0.001) currentC = targetC;
      if (Math.abs(targetA - currentA) < 0.001) currentA = targetA;
      if (Math.abs(target - current) < 0.0005) current = target;
      if (Math.abs(targetY - currentY) < 0.001) currentY = targetY;
    }
    const key = current + currentY * 10 + currentA * 100 + currentC * 1000;
    if (visible && key !== drawn) {
      draw(current);
      drawn = key;
    }
    requestAnimationFrame(tick);
  };

  Promise.all(files.map((f) => loadImage(`hero-glow/${f}`)))
    .then((images) => {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      images.forEach((img, i) => {
        setupTexture(gl, i);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.uniform1i(gl.getUniformLocation(program, names[i]), i);
      });
      setupTexture(gl, 5);
      gl.uniform1i(gl.getUniformLocation(program, 'uGrid'), 5);
      video.replaceWith(canvas);
      requestAnimationFrame(() => requestAnimationFrame(heroReady));
      fit();
      new ResizeObserver(fit).observe(canvas);
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      }).observe(canvas);
      requestAnimationFrame(tick);
    })
    .catch(() => useFallback(video));

  const setTarget = (clientX, clientY) => {
    target = Math.max(0, Math.min(1, clientX / window.innerWidth));
    const rect = canvas.getBoundingClientRect();
    if (rect.height) {
      const fy = (clientY - rect.top) / rect.height;
      targetY = Math.max(-1, Math.min(1, (0.46 - fy) / 0.35));
      const lw = rect.width * LOGO[2];
      const l0 = rect.left + rect.width * LOGO[0];
      const gap = Math.max(l0 - clientX, clientX - (l0 + lw), 0);
      targetC = Math.max(-0.3, Math.min(1.3, (clientX - l0) / lw));
      targetA = 0.8 + 0.45 * Math.min(gap / (lw * 0.5), 1);
    }
  };
  const onPointer = (e) => {
    if (touch.matches || e.pointerType === 'touch') return;
    setTarget(e.clientX, e.clientY);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
}
