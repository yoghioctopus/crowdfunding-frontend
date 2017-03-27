import React, {Component, PropTypes} from 'react'
import {css} from 'glamor'
import {gql, graphql} from 'react-apollo'

import {
  Button, Field,
  Grid, Span, P,
  colors
} from '@project-r/styleguide'

const styles = {
  packageHeader: css({
  }),
  packageTitle: css({
    fontSize: 22,
    lineHeight: '28px'
  }),
  packagePrice: css({
    color: colors.primary,
    lineHeight: '28px',
    fontSize: 22
  }),
  package: css({
    fontFamily: 'sans-serif',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottom: `1px solid ${colors.disabled}`
  }),
  packageContent: css({
    '& p': {
      lineHeight: 1.3,
      fontWeight: 300
    }
  })
}

const MESSAGES = {
  'package/DONATE/title': 'Spenden – sonst nichts',
  'package/DONATE/description': 'Sie wollen hervorragenden Journalismus unterstützen, ohne ihn zu lesen. Aber mit Geld. Denn Sie wissen: ohne Geld läuft nichts, nicht einmal die Ratten in den Lagerschuppen.',
  'package/POSTER/title': 'Das Manifest',
  'package/POSTER/description': 'Sie sind vorsichtig und entscheiden sich statt dem Produkt für den Bauplan des Produkts. Diesen erhalten Sie prächtig in A3, ein Schmuck für jede Wand. Aber Achtung: Das Magazin erhalten Sie dafür noch nicht.',
  'package/ABO/title': 'Abonnement für ein Jahr',
  'package/ABO/description': 'Willkommen an Bord! Sie erhalten für ein Jahr unser Magazin. Und werden zu einem kleinen Teil Mitbesitzerin.',
  'package/ABO_GIVE/title': 'Abonnements verschenken',
  'package/ABO_GIVE/description': 'Sie wollen Ihren Freunden oder Feinden das heisseste Magazin für ein Jahr schenken. Und haben die Gelegenheit, diesen zusätzlich für X Franken ein Notizbuch dazu zu schenken – damit diese nicht nur Cleveres lesen, sondern auch schreiben können.',
  'package/BENEFACTOR/title': 'Gönner Abonnement',
  'package/BENEFACTOR/description': 'Sie wollen nicht nur ein unabhängiges Magazin lesen, sondern Sie wollen sich auch nachhaltig dafür ein setzten, dass dieses existiert. Und fördern ein neues Modell für Journalismus mit dem nachdrücklichsten Argument, das möglich ist: mit Geld.',
  'option/ABO/label': 'Mitgliedschaften',
  'option/NOTEBOOK/label': 'Notizbuch'
}

const query = gql`
{
  crowdfunding(name: "REPUBLIK") {
    id
    name
    packages {
      id
      name
      options {
        id
        price
        userPrice
        minAmount
        maxAmount
        defaultAmount
        reward {
          ... on MembershipType {
            id
            name
          }
          ... on Goodie {
            id
            name
          }
        }
      }
    }
  }
}
`

const calculateMinAmount = (pkg, state) => {
  return Math.max(pkg.options.reduce(
    (amount, option) => amount + (option.userPrice
      ? 0
      : (option.price * (state[option.id] !== undefined ? state[option.id] : option.minAmount))
    ),
    0
  ), 100)
}

class Accordion extends Component {
  constructor (props) {
    super(props)
    this.state = {
      activeIndex: 2,
      selectedIndex: undefined
    }
  }
  render () {
    if (this.props.loading) {
      return <P>…</P>
    }
    if (this.props.error) {
      return <P>{this.props.error}</P>
    }

    const {
      activeIndex,
      selectedIndex
    } = this.state

    const select = pkg => {
      const params = {
        amount: this.state.amount || pkg.options.reduce(
          (amount, option) => amount + option.price * option.minAmount,
          0
        ),
        package: pkg.name
      }

      const configurableOptions = pkg.options.filter(option => (
        option.minAmount !== option.maxAmount
      ))
      if (configurableOptions.length) {
        configurableOptions.forEach(option => {
          params[option.id] = this.state[option.id]
        })
      }

      this.props.onSelect(
        params
      )
    }

    const {crowdfunding: {packages}} = this.props

    return (
      <div>
        {
          packages.map((pkg, i) => {
            const isSelected = selectedIndex === i
            const isActive = isSelected || activeIndex === i
            const configurableOptions = pkg.options.filter(option => (
              option.minAmount !== option.maxAmount
            ))
            const hasOptions = !!configurableOptions.length

            const price = pkg.options.reduce(
              (amount, option) => amount + option.price * option.minAmount,
              0
            )

            return (
              <div key={i} {...styles.package}
                style={{
                  cursor: isSelected ? 'default' : 'pointer'
                }}
                onMouseOver={() => this.setState({
                  activeIndex: i
                })}
                onClick={() => {
                  if (!hasOptions) {
                    return select(pkg)
                  }
                  if (isSelected) {
                    return
                  }

                  const nextState = {
                    selectedIndex: i,
                    amount: pkg.options.reduce(
                      (amount, option) => amount + option.price * option.defaultAmount,
                      0
                    )
                  }

                  configurableOptions.forEach(option => {
                    nextState[option.id] = option.defaultAmount
                  })
                  this.setState(nextState)
                }}>
                <div {...styles.packageHeader}>
                  <div {...styles.packageTitle}>{MESSAGES[`package/${pkg.name}/title`]}</div>
                  <div {...styles.packagePrice}>
                    {price ? `CHF ${price / 100}` : ''}
                  </div>
                </div>
                <div {...styles.packageContent}
                  style={{
                    display: isActive ? 'block' : 'none'
                  }}>
                  <p>{MESSAGES[`package/${pkg.name}/description`]}</p>
                  {hasOptions && <div style={{marginTop: 20}}>
                    <Grid>
                      {configurableOptions.map((option, i) => (
                        <Span s='1/2' m='3/6' key={i}>
                          <Field
                            label={MESSAGES[`option/${option.reward.name}/label`] || option.reward.name}
                            type='number'
                            value={this.state[option.id]}
                            onChange={(event) => {
                              const value = event.target.value
                              if (value > option.maxAmount || value < option.minAmount) {
                                return
                              }
                              this.setState((state) => {
                                const nextState = {
                                  [option.id]: value
                                }
                                const minAmount = calculateMinAmount(pkg, {
                                  ...state,
                                  ...nextState
                                })
                                if (!state.amountCustom || minAmount > state.amount) {
                                  nextState.amount = minAmount
                                  nextState.amountCustom = false
                                }
                                return nextState
                              })
                            }}
                            />
                        </Span>
                      ))}
                      <Span s='1/2' m='3/6'>
                        <Field
                          label='Betrag'
                          type='number'
                          value={this.state.amount / 100}
                          onChange={(event) => {
                            this.setState({
                              amount: event.target.value * 100,
                              amountCustom: true
                            })
                          }} />
                      </Span>
                    </Grid>
                    <br /><br />
                    <Button
                      disabled={!isSelected}
                      onClick={() => select(pkg)}>
                      Weiter
                    </Button>
                  </div>}
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }
}

Accordion.propTypes = {
  onSelect: PropTypes.func.isRequired
}

const AccordionWithQuery = graphql(query, {
  props: ({ data }) => {
    return {
      loading: data.loading,
      error: data.error,
      crowdfunding: data.crowdfunding
    }
  }
})(Accordion)

export default AccordionWithQuery