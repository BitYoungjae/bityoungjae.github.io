(function ($) {
    $('.article img:not(".not-gallery-item")').each(function () {
        // wrap images with link and add caption if possible
        if ($(this).parent('a').length === 0) {
            $(this).wrap('<a class="gallery-item" href="' + $(this).attr('src') + '"></a>');
            if (this.alt) {
                $(this).after('<div class="has-text-centered is-size-6 has-text-grey caption">' + this.alt + '</div>');
            }
        }
    });

    if (typeof (moment) === 'function') {
        $('.article-meta time').each(function () {
            $(this).text(moment($(this).attr('datetime')).fromNow());
        });
    }

    $('.article > .content > table').each(function () {
        if ($(this).width() > $(this).parent().width()) {
            $(this).wrap('<div class="table-overflow"></div>');
        }
    });

    function adjustNavbar() {
        const navbarWidth = $('.navbar-main .navbar-start').outerWidth() + $('.navbar-main .navbar-end').outerWidth();
        if ($(document).outerWidth() < navbarWidth) {
            $('.navbar-main .navbar-menu').addClass('is-flex-start');
        } else {
            $('.navbar-main .navbar-menu').removeClass('is-flex-start');
        }
    }
    adjustNavbar();
    $(window).resize(adjustNavbar);

    $('figure.highlight table').wrap('<div class="highlight-body">');
    if (typeof (IcarusThemeSettings) !== 'undefined' &&
        typeof (IcarusThemeSettings.article) !== 'undefined' &&
        typeof (IcarusThemeSettings.article.highlight) !== 'undefined') {
        if (typeof (ClipboardJS) !== 'undefined' && IcarusThemeSettings.article.highlight.clipboard) {
            $('figure.highlight').each(function () {
                var id = 'code-' + Date.now() + (Math.random() * 1000 | 0);
                var button = '<a href="javascript:;" class="copy" title="Copy" data-clipboard-target="#' + id + ' .code"><i class="fas fa-copy"></i></a>';
                $(this).attr('id', id);
                if ($(this).find('figcaption').length) {
                    $(this).find('figcaption').prepend(button);
                } else {
                    $(this).prepend('<figcaption>' + button + '</figcaption>');
                }
            });
            new ClipboardJS('.highlight .copy');
        }
        var fold = IcarusThemeSettings.article.highlight.fold;
        if (fold.trim()) {
            var button = '<span class="fold">' + (fold === 'unfolded' ? '<i class="fas fa-angle-down"></i>' : '<i class="fas fa-angle-right"></i>') + '</span>';
            $('figure.highlight').each(function () {
                if ($(this).find('figcaption').length) {
                    $(this).find('figcaption').prepend(button);
                } else {
                    $(this).prepend('<figcaption>' + button + '</figcaption>');
                }
            });

            function toggleFold(codeBlock, isFolded) {
                var $toggle = $(codeBlock).find('.fold i');
                !isFolded ? $(codeBlock).removeClass('folded') : $(codeBlock).addClass('folded');
                !isFolded ? $toggle.removeClass('fa-angle-right') : $toggle.removeClass('fa-angle-down');
                !isFolded ? $toggle.addClass('fa-angle-down') : $toggle.addClass('fa-angle-right');
            }

            $('figure.highlight').each(function () {
                toggleFold(this, fold === 'folded');
            });
            $('figure.highlight figcaption .fold').click(function () {
                var $code = $(this).closest('figure.highlight');
                toggleFold($code.eq(0), !$code.hasClass('folded'));
            });
        }
    }

    var $toc = $('#toc');
    if ($toc.length > 0) {
        var $mask = $('<div>');
        $mask.attr('id', 'toc-mask');

        $('body').append($mask);

        function toggleToc() {
            $toc.toggleClass('is-active');
            $mask.toggleClass('is-active');
        }

        $toc.on('click', toggleToc);
        $mask.on('click', toggleToc);
        $('.navbar-main .catalogue').on('click', toggleToc);
    }
})(jQuery);

{
    const L = {};
    const curry = f => (h, ...args) => args.length ? f(h, ...args) : (...args) => f(h, ...args);

    L.map = curry(function* (f, iter) {
        let previous = null;
        for (const one of iter) {
            yield f(one, previous);
            previous = one;
        }
    });

    L.filter = curry(function* (f, iter) {
        for (const one of iter) {
            if (f(one)) yield one;
        }
    });

    L.take = curry(function* (n, iter) {
        const iterator = iter[Symbol.iterator]();
        let now;

        do {
            now = iterator.next();
            now.value && (yield now.value);

            if (!--n) break;
        } while (!now.done);
    });

    const take = curry((n, iter) => {
        const result = [];
        const iterator = iter[Symbol.iterator]();
        let now = null;

        do {
            now = iterator.next();
            now.value && result.push(now.value);

            if (!--n) break;
        } while (!now.done);

        return result;
    });

    const reduce = curry(
        (f, iter, start) => {
            const iterator = iter[Symbol.iterator]();
            let acc = null;

            if (start) {
                acc = start;
            } else {
                acc = iterator.next().value;
            }

            for (const one of iterator) {
                acc = f(acc, one);
            }

            return acc;
        }
    );

    const go = (...routine) => reduce((acc, now) => now(acc), routine);
    const pipe = (first, ...routine) => (...args) => go(first(...args), ...routine);

    const testFunc = (f, n = 1000, ...args) => {
        console.time(f.name);
        while (n--) {
            f(...args);
        }
        console.timeEnd(f.name);
    };

    const getElementsList = curry((f, root) => go(
        Array.from(root.children),
        L.filter(f),
        L.map(({
            tagName,
            id,
            textContent
        }) => {
            return {
                tagName,
                id,
                textContent,
                subHeadings: []
            };
        })
    ));

    const isHeading = element => element.nodeName.startsWith("H");
    const getHeadingElementsList = getElementsList(isHeading);

    const getNumberByHeadingTagName = (tagName) => tagName[tagName.length - 1] >> 0;
    const getDepthDiff = (one, two) => getNumberByHeadingTagName(one) - getNumberByHeadingTagName(two);
    const normalizeHeadingTagName = (tagName, depth) => "H" + (getNumberByHeadingTagName(tagName) + depth);

    const normalizeHeadingElementList = (list) => L.map(
        (element, previous) => {
            if (!previous) return element;
            if (element.tagName === "H1") element.tagName = "H2";

            const depthDiff = getDepthDiff(previous.tagName, element.tagName);

            if (depthDiff <= -2) {
                const tagName = element.tagName;
                element.tagName = normalizeHeadingTagName(tagName, depthDiff + 1);
            }

            return element;
        }, list);

    const getHeadingElementsChain = (list) => {
        const iterator = list[Symbol.iterator]();
        const parentPointer = new Map();

        let result = {
            tagName: "H1",
            textContent: "",
            subHeadings: []
        };
        let now = iterator.next();
        let previous = null;

        if (now.value.tagName === "H1") {
            result = now.value;
            previous = now.value;
        } else {
            result = {
                tagName: "H1",
                textContent: now.value.textContent,
                subHeadings: []
            };

            result.subHeadings.push(now.value);
            previous = result;
        }

        while ((now = iterator.next()) && now.value) {
            const {
                tagName
            } = now.value;

            if (previous.tagName < tagName) {
                const subArray = [];
                subArray.push(now.value);

                previous.subHeadings.push(now.value);

                parentPointer.set(tagName, previous);
            } else if (previous.tagName >= tagName) {
                if (parentPointer.get(tagName)) {
                    parentPointer.get(tagName).subHeadings.push(now.value);
                }
            } else {
                return {};
            }

            previous = now.value;
        }

        return result;
    };

    const createList = now => {
        const li = document.createElement("LI");
        const anchor = document.createElement("A");

        anchor.textContent = now.textContent;
        anchor.href = `#${now.id}`;
        li.style.listStyle = "none";
        li.style.fontSize = ".9em";

        li.appendChild(anchor);

        return li;
    }

    const createNestedList = (now) => {
        const li = createList(now);

        if (now.subHeadings.length) {
            const ul = document.createElement("UL");
            li.appendChild(ul);

            now.subHeadings.forEach(
                child => {
                    ul.appendChild(createNestedList(child))
                }
            );
        }

        return li;
    }

    const convertHeadingElementChainToListElement = (now) => {
        const ul = document.createElement("UL");

        ul.appendChild(createNestedList(now));

        return ul;
    };

    const createTOCObject = pipe(
        getHeadingElementsList,
        normalizeHeadingElementList,
        getHeadingElementsChain
    );

    const createTOC = pipe(
        createTOCObject,
        convertHeadingElementChainToListElement
    );

    const toc = document.getElementsByClassName("toc")[0];
    const title = document.getElementsByClassName("title")[0];
    if (toc) {
        try {
        const content = document.getElementsByClassName("content")[0];
        const tocObj = createTOCObject(content);
        
        tocObj.textContent = title.textContent;
        tocObj.id = "";

        const result = convertHeadingElementChainToListElement(tocObj);
        const header = document.createElement("H2");
        header.textContent = "목차";

        toc.appendChild(header);
        toc.appendChild(result);
        } catch(e) {
            console.log("목차 없음");
        }
    }
}